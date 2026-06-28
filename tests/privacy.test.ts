import { describe, it, expect } from "vitest";
import { computeVisitorId, dailySalt } from "@/lib/privacy";

describe("privacy: visitor id hashing", () => {
  const base = {
    ip: "203.0.113.7",
    userAgent: "Mozilla/5.0 Chrome/120",
    siteId: "site-1",
  };

  it("is deterministic within the same day", () => {
    const date = new Date("2026-06-28T10:00:00Z");
    const a = computeVisitorId({ ...base, date });
    const b = computeVisitorId({ ...base, date: new Date("2026-06-28T22:00:00Z") });
    expect(a).toBe(b);
  });

  it("rotates across days (no cross-day tracking)", () => {
    const a = computeVisitorId({ ...base, date: new Date("2026-06-28T10:00:00Z") });
    const b = computeVisitorId({ ...base, date: new Date("2026-06-29T10:00:00Z") });
    expect(a).not.toBe(b);
  });

  it("differs per site for the same visitor", () => {
    const date = new Date("2026-06-28T10:00:00Z");
    const a = computeVisitorId({ ...base, siteId: "site-1", date });
    const b = computeVisitorId({ ...base, siteId: "site-2", date });
    expect(a).not.toBe(b);
  });

  it("differs by IP and user agent", () => {
    const date = new Date("2026-06-28T10:00:00Z");
    const a = computeVisitorId({ ...base, date });
    const b = computeVisitorId({ ...base, ip: "198.51.100.1", date });
    const c = computeVisitorId({ ...base, userAgent: "Safari", date });
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
  });

  it("produces a 32-char hex digest and never contains the raw IP", () => {
    const id = computeVisitorId({ ...base, date: new Date("2026-06-28T10:00:00Z") });
    expect(id).toMatch(/^[0-9a-f]{32}$/);
    expect(id).not.toContain(base.ip);
  });

  it("daily salt changes with the date", () => {
    expect(dailySalt(new Date("2026-06-28T00:00:00Z"))).not.toBe(
      dailySalt(new Date("2026-06-29T00:00:00Z")),
    );
  });
});
