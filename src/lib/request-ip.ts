/**
 * Best-effort client IP extraction from a Request's headers.
 *
 * On Vercel the real client IP is in `x-forwarded-for` (left-most entry) or
 * `x-real-ip`. The IP is used *only* transiently to derive geo + the visitor
 * hash and is never persisted.
 */
export function getClientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return null;
}
