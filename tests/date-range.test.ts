import { describe, it, expect } from "vitest";
import { resolveRange, parseRangeKey } from "@/lib/date-range";

describe("date-range resolution", () => {
  const now = new Date("2026-06-28T15:00:00Z");

  it("uses hourly granularity for short ranges", () => {
    expect(resolveRange("today", now).granularity).toBe("hour");
    expect(resolveRange("24h", now).granularity).toBe("hour");
  });

  it("uses daily granularity for multi-day ranges", () => {
    expect(resolveRange("7d", now).granularity).toBe("day");
    expect(resolveRange("30d", now).granularity).toBe("day");
    expect(resolveRange("90d", now).granularity).toBe("day");
  });

  it("computes an equal-length preceding period for trends", () => {
    const r = resolveRange("7d", now);
    const span = r.to.getTime() - r.from.getTime();
    const prevSpan = r.prevTo.getTime() - r.prevFrom.getTime();
    expect(prevSpan).toBe(span);
    expect(r.prevTo.getTime()).toBe(r.from.getTime());
  });

  it("falls back to 7d for unknown keys", () => {
    expect(parseRangeKey("bogus")).toBe("7d");
    expect(parseRangeKey(null)).toBe("7d");
    expect(parseRangeKey("30d")).toBe("30d");
  });
});
