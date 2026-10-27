import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { db } from './db.js';
import users from './routes/users.js';
import repos from './routes/repos.js';
import importRouter from './routes/import.js';
import tools from './routes/tools.js';
import validate from './routes/validate.js';
import marketplace from './routes/marketplace.js';
import tokens from './routes/tokens.js';
import { verifyToken, TokenPayload, verifyPat } from './auth.js';
import { rateLimit } from './ratelimit.js';

const app = new Hono<{ Variables: { user: TokenPayload } }>();

// CORS is opt-in: the app is same-origin through nginx, so by default no
// cross-origin headers are emitted. Set CORS_ORIGINS to allow extra origins
// (comma separated, exact match, no wildcard).
const corsOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use('*', async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('Referrer-Policy', 'no-referrer');
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  c.header('Cross-Origin-Resource-Policy', 'same-origin');
});

if (corsOrigins.length > 0) {
  app.use('/api/*', async (c, next) => {
    const origin = c.req.header('Origin');
    if (origin && corsOrigins.includes(origin)) {
      c.header('Access-Control-Allow-Origin', origin);
      c.header('Vary', 'Origin');
      c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      c.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
      if (c.req.method === 'OPTIONS') return c.body(null, 204);
    }
    await next();
  });
}

// Commit bodies are capped at 5 MB by the route; leave room for JSON/multipart.
app.use('*', bodyLimit({
  maxSize: 6 * 1024 * 1024,
  onError: (c) => c.json({ detail: 'payload too large (max 6 MB)' }, 413),
}));

// Rate limits: cheap, per-IP, aimed at credential stuffing and abuse.
const registerLimiter = rateLimit('register', 60 * 60_000, 10);
app.use('/api/login', rateLimit('login', 5 * 60_000, 10));
app.use('/api/users', async (c, next) => {
  // Only registration itself: availability checks and avatar uploads must not
  // consume the hourly registration budget.
  if (c.req.method === 'POST' && c.req.path === '/api/users') return registerLimiter(c, next);
  return next();
});
app.use('/api/users/recover', rateLimit('recover', 15 * 60_000, 5));
app.use('/api/users/reset', rateLimit('reset', 15 * 60_000, 10));
app.use('/api/users/password', rateLimit('bootstrap', 60 * 60_000, 5));
app.use('/api/import', rateLimit('import', 60 * 60_000, 30));
app.use('/api/import/paste', rateLimit('import', 60 * 60_000, 30));

// JWT middleware: verified identity lands in context; anonymous stays null.
// A valid Personal Access Token (PAT) in the Authorization header is accepted
// as an alternative to JWT for API automation (imports, CI, deploys…).
app.use('/api/*', async (c, next) => {
  const h = c.req.header('Authorization') || '';
  if (h.startsWith('Bearer ')) {
    const token = h.slice(7);
    let payload = verifyToken(token);
    if (payload) {
      c.set('user', payload);
    } else {
      const pat = await verifyPat(token);
      if (pat) {
        c.set('user', { sub: pat.userId, u: pat.username, pat: true });
      }
    }
  }
  return next();
});

app.get('/api/health', (c) => {
  try {
    db.prepare('SELECT 1').get();
    return c.json({ ok: true, time: new Date().toISOString() });
  } catch (e) {
    return c.json({ ok: false, time: new Date().toISOString() }, 503);
  }
});

// Public counters for the landing page — avoids shipping the user list just
// to compute three numbers.
app.get('/api/stats', (c) => {
  const repos = (db.prepare("SELECT COUNT(*) AS n FROM repos WHERE visibility != 'private'").get() as any).n;
  const usersCount = (db.prepare('SELECT COUNT(*) AS n FROM users').get() as any).n;
  const stars = (db.prepare("SELECT COALESCE(SUM(stars), 0) AS n FROM repos WHERE visibility != 'private'").get() as any).n;
  return c.json({ repos, users: usersCount, stars });
});

app.route('/api', users);
app.route('/api', repos);
app.route('/api', importRouter);
app.route('/api', tools);
app.route('/api', validate);
app.route('/api', marketplace);
app.route('/api', tokens);

app.notFound((c) => c.json({ detail: 'not found' }, 404));

app.onError((err, c) => {
  const status = Number((err as any).status) || 500;
  if (status >= 400 && status < 500) return c.json({ detail: err.message }, status as any);
  // Never leak internal paths/stack traces to clients.
  console.error(`[api] ${c.req.method} ${c.req.path}`, err);
  return c.json({ detail: 'internal server error' }, 500);
});

// seed minimale al primo avvio
const n = (db.prepare('SELECT COUNT(*) AS n FROM users').get() as any).n;
if (n === 0) {
  const mk = (u: string, d: string, col: string) =>
    db.prepare('INSERT INTO users (username, display_name, color) VALUES (?, ?, ?)').run(u, d, col);
  mk('neo', 'Neo', '#33ff66');
  mk('trinity', 'Trinity', '#ffb000');
  console.log('[seed] users neo, trinity. Crea la prima skill dalla UI o via POST /api/repos.');
}

const port = Number(process.env.PORT || 8901);
const server = serve({ fetch: app.fetch, port }, () => console.log(`robogarage backend → http://localhost:${port}`));

// Graceful shutdown so `docker stop` lets SQLite checkpoint its WAL.
function shutdown(signal: string) {
  console.log(`[server] ${signal} — shutting down`);
  server.close(() => {
    try {
      db.close();
    } catch {
      /* already closed */
    }
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 5000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
