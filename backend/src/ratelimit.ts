import type { MiddlewareHandler } from 'hono';

// ---------------------------------------------------------------------------
// Minimal in-memory fixed-window rate limiter. One backend instance keeps all
// state; at multi-replica scale move this to Redis (the interface stays).
// ---------------------------------------------------------------------------

interface Bucket {
  count: number;
  reset: number;
}

const buckets = new Map<string, Bucket>();
let lastCleanup = Date.now();

function clientIp(c: any): string {
  // Behind nginx: X-Real-IP is overwritten with $remote_addr, so it cannot be
  // spoofed by clients. X-Forwarded-For may contain attacker-supplied leading
  // values, hence the last hop as fallback (never the first).
  const real = c.req.header('x-real-ip');
  if (real) return real;
  const xff = c.req.header('x-forwarded-for');
  if (xff) return xff.split(',').pop()!.trim();
  return 'unknown';
}

export function rateLimit(name: string, windowMs: number, max: number): MiddlewareHandler {
  return async (c, next) => {
    const now = Date.now();
    if (now - lastCleanup > 60_000) {
      for (const [key, bucket] of buckets) if (bucket.reset <= now) buckets.delete(key);
      lastCleanup = now;
    }

    const key = `${name}:${clientIp(c)}`;
    let bucket = buckets.get(key);
    if (!bucket || bucket.reset <= now) {
      bucket = { count: 0, reset: now + windowMs };
      buckets.set(key, bucket);
    }
    bucket.count += 1;

    c.header('X-RateLimit-Limit', String(max));
    c.header('X-RateLimit-Remaining', String(Math.max(0, max - bucket.count)));
    if (bucket.count > max) {
      c.header('Retry-After', String(Math.max(1, Math.ceil((bucket.reset - now) / 1000))));
      return c.json({ detail: 'too many requests — try again later' }, 429);
    }
    await next();
  };
}
