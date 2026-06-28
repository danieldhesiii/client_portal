/**
 * Tiny in-memory fixed-window rate limiter for the ingestion endpoint.
 *
 * This is intentionally dependency-free and good enough to blunt obvious abuse
 * on a single instance. For multi-region/high-scale deployments swap this for a
 * shared store (e.g. Upstash Redis / Vercel KV-style) without changing callers.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const WINDOW_MS = 60_000; // 1 minute
const MAX_PER_WINDOW = 600; // generous: ~10 events/sec per key

// Opportunistic cleanup so the map does not grow unbounded.
let lastSweep = Date.now();
function sweep(now: number) {
  if (now - lastSweep < WINDOW_MS) return;
  lastSweep = now;
  for (const [key, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(key);
  }
}

export function rateLimit(key: string): { ok: boolean; remaining: number } {
  const now = Date.now();
  sweep(now);
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true, remaining: MAX_PER_WINDOW - 1 };
  }
  existing.count += 1;
  const remaining = MAX_PER_WINDOW - existing.count;
  return { ok: remaining >= 0, remaining: Math.max(0, remaining) };
}
