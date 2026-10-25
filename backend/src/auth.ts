import { createHmac, randomBytes } from 'crypto';

// ---------------------------------------------------------------------------
// Minimal JWT (HS256, no dependencies): keeps install light and auditable.
// Stateless — any backend replica verifies with the same JWT_SECRET.
// In production set JWT_SECRET to a long random value; dev default warns.
// ---------------------------------------------------------------------------

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
