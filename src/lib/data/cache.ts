/**
 * Tiny in-process TTL cache for the analytics read layer. Its job is to absorb
 * the burst of identical queries produced by (a) rapid navigation between
 * dashboard sections and (b) the client polling loops (nav summary, realtime),
 * which otherwise re-run the same aggregate scans against the remote Postgres
 * every few seconds.
 *
 * On Vercel Fluid Compute the function instance is reused across requests, so a
 * short-lived in-memory cache lands real hits within a warm instance. It is not
 * shared across instances — that's fine; the goal is to collapse the repeated
 * work of a single user clicking around, not to be a distributed cache.
 *
 * `inflight` additionally de-dupes concurrent identical calls, so when a page
 * and the nav summary ask for the same aggregate at the same moment they share
 * one database round-trip instead of two.
 *
 * Access control is deliberately NOT cached — callers must run their
 * `assertSiteAccess` check before reaching here.
 */

type Entry = { value: unknown; expires: number };

const store = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();

/** Default freshness window for cached analytics reads. */
export const CACHE_TTL_MS = 30_000;

export async function cached<T>(
  key: string,
  fn: () => Promise<T>,
  ttlMs: number = CACHE_TTL_MS,
): Promise<T> {
  const now = Date.now();

  const hit = store.get(key);
  if (hit && hit.expires > now) return hit.value as T;

  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;

  const p = (async () => {
    try {
      const value = await fn();
      store.set(key, { value, expires: Date.now() + ttlMs });
      return value;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, p);
  return p as Promise<T>;
}
