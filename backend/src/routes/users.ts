import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { Hono } from 'hono';
import * as fs from 'fs';
import { db } from '../db.js';
import { avatarAbs, avatarContentType, deleteAvatar, saveAvatar } from '../avatars.js';
import { signToken, authed, verifyHash } from '../auth.js';
import { appUrl, sendResetMail } from '../mail.js';

const app = new Hono();
const scryptAsync = promisify(scrypt) as (password: string, salt: string, keylen: number) => Promise<Buffer>;

export const USERNAME_RE = /^[a-z0-9-]{2,24}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD = 8;
export const normalizeUsername = (u: string) => (u || '').trim().toLowerCase();
export const normalizeEmail = (e: string) => (e || '').trim().toLowerCase();

// Never expose password_hash or email: every public read goes through these
// columns. Email is only returned to the account owner (login response).
const PUBLIC_COLS = 'id, username, display_name, color, avatar_url, created_at';

export function getUserRow(id: number) {
  return db.prepare(`SELECT ${PUBLIC_COLS} FROM users WHERE id = ?`).get(id);
}

function getUserWithHash(username: string): any {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
}

function getUserByEmail(email: string): any {
  if (!email) return undefined;
  return db.prepare("SELECT * FROM users WHERE email = ? AND email != ''").get(email);
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const hash = await scryptAsync(password, salt, 64);
  return `${salt}:${hash.toString('hex')}`;
}

// Constant-time comparison for the bootstrap admin token.
function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

app.get('/users', (c) => {
  const rows = db.prepare(`SELECT ${PUBLIC_COLS} FROM users ORDER BY username`).all();
  return c.json(rows);
});

// Username / email availability — indexed lookups, O(log n) at any scale.
app.get('/users/check', (c) => {
  const emailQ = c.req.query('email');
  if (emailQ !== undefined) {
    const email = normalizeEmail(emailQ);
    if (!EMAIL_RE.test(email)) return c.json({ email, available: false, reason: 'invalid format' });
    const taken = db.prepare("SELECT 1 FROM users WHERE email = ? AND email != ''").get(email);
    return c.json({ email, available: !taken });
  }
  const username = normalizeUsername(c.req.query('username') || '');
  if (!USERNAME_RE.test(username)) return c.json({ username, available: false, reason: 'invalid format' });
  const taken = db.prepare('SELECT 1 FROM users WHERE username = ?').get(username);
  return c.json({ username, available: !taken });
});

// Register — username + email + password (async scrypt, salt per user).
app.post('/users', async (c) => {
  let { username, email, display_name, color, avatar_url, password } = await c.req.json();
  username = normalizeUsername(username);
  email = normalizeEmail(email);
  if (!USERNAME_RE.test(username)) return c.json({ detail: 'username: 2-24 chars, lowercase, numbers, hyphens' }, 400);
  if (!EMAIL_RE.test(email)) return c.json({ detail: 'email: invalid address' }, 400);
  if (!password || String(password).length < MIN_PASSWORD) {
    return c.json({ detail: `password: at least ${MIN_PASSWORD} characters` }, 400);
  }
  if (getUserByEmail(email)) return c.json({ detail: 'email already registered' }, 409);
  try {
    const info = db.prepare('INSERT INTO users (username, email, display_name, color, avatar_url, password_hash) VALUES (?, ?, ?, ?, ?, ?)')
      .run(username, email, (display_name || username).slice(0, 60), color || '#33ff66', avatar_url || '', await hashPassword(String(password)));
    const row = getUserRow(info.lastInsertRowid as number) as any;
    return c.json({ ...row, token: signToken(row) }, 201);
  } catch {
    return c.json({ detail: 'username already taken' }, 409);
  }
});

// Login — username or email + password. Returns the account's own profile
// (including its email) plus a JWT.
app.post('/login', async (c) => {
  const { username, password } = await c.req.json();
  const id = normalizeUsername(username);
  const user = getUserWithHash(id) || getUserByEmail(normalizeEmail(id));
  if (!user) return c.json({ detail: 'Invalid credentials' }, 401);
  if (!user.password_hash) {
    return c.json({ detail: 'This account has no password yet — use "Forgot password?" to set one', code: 'no_password' }, 401);
  }
  if (!password || !(await verifyHash(String(password), user.password_hash))) {
    return c.json({ detail: 'Invalid credentials' }, 401);
  }
  const { password_hash: _drop, ...pub } = user;
  return c.json({ ...pub, token: signToken(user) });
});

// Legacy bootstrap for accounts created before passwords existed. This is an
// admin-only operation: it requires ADMIN_TOKEN and refuses accounts that
// already have a password (no account takeover).
app.post('/users/password', async (c) => {
  const admin = process.env.ADMIN_TOKEN || '';
  if (!admin) return c.json({ detail: 'not found' }, 404);
  const given = c.req.header('x-admin-token') || '';
  if (!safeEqual(admin, given)) return c.json({ detail: 'forbidden' }, 403);
  const { username, password } = await c.req.json();
  const user = getUserWithHash(normalizeUsername(username));
  if (!user) return c.json({ detail: 'user not found' }, 404);
  if (user.password_hash) return c.json({ detail: 'password already set — use the recovery flow' }, 409);
  if (!password || String(password).length < MIN_PASSWORD) {
    return c.json({ detail: `password: at least ${MIN_PASSWORD} characters` }, 400);
  }
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(await hashPassword(String(password)), user.id);
  return c.json(getUserRow(user.id));
});

// Profile image upload (multipart, "avatar" field). Fresh token in the name
// → automatic cache-busting; old file deleted.
app.post('/users/:id/avatar', async (c) => {
  const user = getUserRow(Number(c.req.param('id'))) as any;
  if (!user) return c.json({ detail: 'user not found' }, 404);
  const me = authed(c);
  if (!me) return c.json({ detail: 'sign in required' }, 401);
  if (me.id !== user.id) return c.json({ detail: 'you can only change your own avatar' }, 403);
  const body = await c.req.parseBody();
  const file = body['avatar'];
  if (!(file instanceof File)) return c.json({ detail: 'missing "avatar" field' }, 400);
  try {
    const rel = await saveAvatar(user.id, file);
    deleteAvatar(user.avatar_url);
    db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').run(rel, user.id);
    return c.json(getUserRow(user.id), 201);
  } catch (e: any) {
    return c.json({ detail: e.message || 'upload failed' }, e.status || 400);
  }
});

// Avatar serving with immutable caching (name changes on every upload).
app.get('/avatars/*', async (c) => {
  const key = c.req.path.replace(/^\/api\/avatars\//, '');
  const abs = avatarAbs(key);
  if (!abs || !fs.existsSync(abs)) return c.json({ detail: 'not found' }, 404);
  const buf = await fs.promises.readFile(abs);
  return c.body(new Uint8Array(buf), 200, {
    'Content-Type': avatarContentType(key),
    'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'",
  });
});

// Password recovery: always 200 (no account enumeration). Tokens are
// 32 random bytes, 30-minute expiry, single-use, max 5 pending per user.
app.post('/users/recover', async (c) => {
  const { username } = await c.req.json();
  const id = normalizeUsername(username);
  const user = getUserWithHash(id) || getUserByEmail(normalizeEmail(id));
  if (user) {
    db.prepare("DELETE FROM password_resets WHERE user_id=? AND (used=1 OR expires_at < datetime('now'))").run(user.id);
    const pending = db.prepare('SELECT COUNT(*) AS n FROM password_resets WHERE user_id=? AND used=0').get(user.id) as any;
    if (pending.n < 5) {
      const token = randomBytes(32).toString('hex');
      db.prepare("INSERT INTO password_resets (token, user_id, expires_at) VALUES (?, ?, datetime('now', '+30 minutes'))").run(token, user.id);
      const link = `${appUrl(new URL(c.req.url).origin)}/reset?token=${token}`;
      try {
        await sendResetMail(user.email || `${user.username}@local`, link);
      } catch (e) {
        console.log('[recover] mail failed:', (e as Error).message);
      }
    }
  }
  return c.json({ ok: true });
});

app.post('/users/reset', async (c) => {
  const { token, password } = await c.req.json();
  if (!token || !password || String(password).length < MIN_PASSWORD) {
    return c.json({ detail: `token + password (${MIN_PASSWORD}+ chars) required` }, 400);
  }
  const row = db
    .prepare("SELECT * FROM password_resets WHERE token=? AND used=0 AND expires_at > datetime('now')")
    .get(String(token)) as any;
  if (!row) return c.json({ detail: 'invalid or expired reset link' }, 400);
  db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(await hashPassword(String(password)), row.user_id);
  db.prepare('UPDATE password_resets SET used=1 WHERE token=?').run(String(token));
  return c.json(getUserRow(row.user_id));
});

export default app;
