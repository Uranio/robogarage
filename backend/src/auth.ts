import { createHmac, randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { db } from './db.js';

// ---------------------------------------------------------------------------
// Minimal JWT (HS256, no dependencies): keeps install light and auditable.
// Stateless — any backend replica verifies with the same JWT_SECRET.
// In production set JWT_SECRET to a long random value; dev default warns.
// ---------------------------------------------------------------------------

const scryptAsync = promisify(scrypt) as (password: string, salt: string, keylen: number) => Promise<Buffer>;

function b64url(input: Buffer | string): string {
  return Buffer.from(input as any).toString('base64url');
}

function signPayload(payload: Record<string, unknown>, secret: string): string {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify(payload));
  const sig = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

export interface TokenPayload {
  sub: number; // user id
  u: string; // username
  iat: number;
  exp: number;
}

export function getSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s) {
    console.warn('[auth] JWT_SECRET not set — using insecure dev default. Set it in production.');
    return 'dev-secret-change-me';
  }
  return s;
}

export function signToken(user: { id: number; username: string }, days = 7): string {
  const now = Math.floor(Date.now() / 1000);
  return signPayload({ sub: user.id, u: user.username, iat: now, exp: now + days * 86400 }, getSecret());
}

export function newCsrfToken(): string {
  return randomBytes(16).toString('hex');
}

/** Hash a plain password/token with scrypt (same scheme as user passwords). */
export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const hash = await scryptAsync(plain, salt, 64);
  return `${salt}:${hash.toString('hex')}`;
}

/** Constant-time verify a plain value against a scrypt hash stored as salt:hex. */
export async function verifyHash(plain: string, stored: string): Promise<boolean> {
  const [salt, hex] = (stored || '').split(':');
  if (!salt || !hex) return false;
  try {
    const expected = Buffer.from(hex, 'hex');
    const actual = await scryptAsync(plain, salt, expected.length);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

/**
 * Verify a Personal Access Token (PAT).
 * Tokens are hex strings; we look up by the first 8 chars (prefix) to avoid
 * running scrypt against every stored token, then constant-time compare.
 * Returns { userId, username } or null. Updates last_used_at on success.
 */
export async function verifyPat(token: string): Promise<{ userId: number; username: string } | null> {
  if (!token || token.length < 16) return null;
  const prefix = token.slice(0, 8);
  const rows = db.prepare(
    `SELECT t.id, t.user_id, t.token_hash, t.expires_at, t.revoked, u.username
     FROM personal_access_tokens t
     JOIN users u ON u.id = t.user_id
     WHERE t.token_prefix = ? AND t.revoked = 0`
  ).all(prefix) as any[];
  for (const row of rows) {
    if (row.expires_at && new Date(row.expires_at) < new Date()) continue;
    if (await verifyHash(token, row.token_hash)) {
      db.prepare('UPDATE personal_access_tokens SET last_used_at = datetime("now") WHERE id = ?').run(row.id);
      return { userId: row.user_id, username: row.username };
    }
  }
  return null;
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const [h, b, sig] = token.split('.');
    if (!h || !b || !sig) return null;
    const expect = createHmac('sha256', getSecret()).update(`${h}.${b}`).digest('base64url');
    if (sig.length !== expect.length) return null;
    let diff = 0;
    for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expect.charCodeAt(i);
    if (diff !== 0) return null;
    const p = JSON.parse(Buffer.from(b, 'base64url').toString()) as TokenPayload;
    if (typeof p.exp !== 'number' || p.exp * 1000 < Date.now()) return null;
    if (typeof p.sub !== 'number' || typeof p.u !== 'string') return null;
    return p;
  } catch {
    return null;
  }
}

// Authenticated identity from Hono context (set by the middleware).
export function authed(c: any): { id: number; username: string } | null {
  const u = c.get('user');
  if (u && typeof u.sub === 'number' && typeof u.u === 'string') {
    return { id: u.sub, username: u.u };
  }
  return null;
}
