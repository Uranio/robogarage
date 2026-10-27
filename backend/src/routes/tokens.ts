import { Hono } from 'hono';
import { randomBytes } from 'crypto';
import { db } from '../db.js';
import { hashPassword, authed, verifyPat } from '../auth.js';

const app = new Hono();

function requireAuth(c: any) {
  if (!authed(c)) return c.json({ detail: 'sign in required' }, 401);
  return null;
}

const DEFAULT_SCOPES = 'repos:write,import:write';
const MAX_TOKENS_PER_USER = 20;

// POST /api/users/tokens — crea un nuovo Personal Access Token.
// Il token in chiaro viene restituito UNA SOLA VOLTA nella risposta.
app.post('/tokens', async (c) => {
  const denied = requireAuth(c);
  if (denied) return denied;
  const me = authed(c)!;

  const { name, scopes, expires_in_days } = await c.req.json({});
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return c.json({ detail: 'name: at least 2 characters' }, 400);
  }
  const tokenName = name.trim().slice(0, 80);

  const existing = db
    .prepare('SELECT COUNT(*) AS n FROM personal_access_tokens WHERE user_id=? AND revoked=0')
    .get(me.id) as any;
  if (existing.n >= MAX_TOKENS_PER_USER) {
    return c.json({ detail: `too many active tokens (max ${MAX_TOKENS_PER_USER})` }, 403);
  }

  let expiresAt: string | null = null;
  if (expires_in_days !== undefined) {
    const days = Number(expires_in_days);
    if (!Number.isFinite(days) || days < 1 || days > 3650) {
      return c.json({ detail: 'expires_in_days: 1-3650' }, 400);
    }
    expiresAt = new Date(Date.now() + days * 86400 * 1000).toISOString();
  }

  const tokenScopes = scopes && typeof scopes === 'string' ? scopes.slice(0, 200) : DEFAULT_SCOPES;

  // Genera il token: prefisso "rk_" + 32 byte esadecimali (64 char).
  const plain = `rk_${randomBytes(32).toString('hex')}`;
  const tokenHash = await hashPassword(plain);
  const tokenPrefix = plain.slice(0, 8);

  const info = db
    .prepare(
      'INSERT INTO personal_access_tokens (user_id, name, token_hash, token_prefix, scopes, expires_at) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(me.id, tokenName, tokenHash, tokenPrefix, tokenScopes, expiresAt);

  return c.json(
    {
      id: info.lastInsertRowid,
      name: tokenName,
      prefix: tokenPrefix,
      scopes: tokenScopes,
      expires_at: expiresAt,
      // ⚠️ Mostrato solo ora: non è più recuperabile.
      token: plain,
    },
    201
  );
});

// GET /api/users/tokens — lista i token dell'utente (mai il valore in chiaro).
app.get('/tokens', (c) => {
  const denied = requireAuth(c);
  if (denied) return denied;
  const me = authed(c)!;

  const rows = db
    .prepare(
      `SELECT id, name, token_prefix AS prefix, scopes, expires_at, last_used_at, revoked, created_at
       FROM personal_access_tokens
       WHERE user_id = ?
       ORDER BY created_at DESC`
    )
    .all(me.id) as any[];
  return c.json(rows);
});

// DELETE /api/users/tokens/:id — revoca un token.
app.delete('/tokens/:id', async (c) => {
  const denied = requireAuth(c);
  if (denied) return denied;
  const me = authed(c)!;

  const id = Number(c.req.param('id'));
  if (!Number.isFinite(id)) return c.json({ detail: 'invalid token id' }, 400);

  const row = db.prepare('SELECT * FROM personal_access_tokens WHERE id=? AND user_id=?').get(id, me.id) as any;
  if (!row) return c.json({ detail: 'token not found' }, 404);

  db.prepare('UPDATE personal_access_tokens SET revoked=1 WHERE id=?').run(id);
  return c.json({ ok: true });
});

export default app;
