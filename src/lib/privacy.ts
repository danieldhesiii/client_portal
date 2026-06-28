import { createHash } from "crypto";

/**
 * Privacy-preserving visitor identity (the Plausible/Fathom approach).
 *
 * We never store raw IP addresses. Instead we derive a `visitorId` by hashing
 * the IP together with the user agent, the siteId and a *daily-rotating salt*.
 * Because the salt changes every day, the same person produces a different
 * hash tomorrow — making cross-day tracking impossible — while still being
 * countable as a unique visitor *within* a single day. The result is not
 * personally identifiable and requires no cookie.
 */

/**
 * Build the rotating salt for a given day. Combines a server secret with the
 * UTC date so the salt is stable for 24h and unknowable to clients.
 */
export function dailySalt(date = new Date()): string {
  const secret = process.env.VISITOR_ID_SECRET ?? "insecure-dev-salt";
  const day = date.toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
  return createHash("sha256").update(`${secret}:${day}`).digest("hex");
}

/**
 * Compute a daily-stable, non-reversible visitor id. Returns a 32-char hex
 * digest. The raw IP is consumed here and must not be persisted by callers.
 */
export function computeVisitorId(opts: {
  ip: string;
  userAgent: string;
  siteId: string;
  date?: Date;
}): string {
  const salt = dailySalt(opts.date);
  return createHash("sha256")
    .update(`${salt}:${opts.siteId}:${opts.ip}:${opts.userAgent}`)
    .digest("hex")
    .slice(0, 32);
}
