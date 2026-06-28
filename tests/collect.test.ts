import { describe, it, expect } from "vitest";
import {
  collectSchema,
  normalizeReferrer,
  normalizePath,
  toEventType,
} from "@/lib/collect";
import { isBot, parseUA } from "@/lib/ua";

describe("collect schema validation", () => {
  it("accepts a valid pageview payload", () => {
    const res = collectSchema.safeParse({
      siteId: "abc123",
      type: "pageview",
      sessionId: "sess1",
      path: "/home",
      screenWidth: 1440,
      language: "en-GB",
    });
    expect(res.success).toBe(true);
  });

  it("defaults type to pageview", () => {
    const res = collectSchema.parse({
      siteId: "abc",
      sessionId: "s",
      path: "/",
    });
    expect(res.type).toBe("pageview");
  });

  it("rejects a missing siteId", () => {
    const res = collectSchema.safeParse({ sessionId: "s", path: "/" });
    expect(res.success).toBe(false);
  });

  it("rejects an over-long path", () => {
    const res = collectSchema.safeParse({
      siteId: "a",
      sessionId: "s",
      path: "/".padEnd(5000, "x"),
    });
    expect(res.success).toBe(false);
  });

  it("maps wire types to prisma EventType", () => {
    expect(toEventType("pageview")).toBe("PAGEVIEW");
    expect(toEventType("heartbeat")).toBe("HEARTBEAT");
    expect(toEventType("session_end")).toBe("SESSION_END");
  });
});

describe("normalizeReferrer", () => {
  it("strips to hostname and drops www", () => {
    expect(normalizeReferrer("https://www.google.com/search?q=x")).toBe(
      "google.com",
    );
  });
  it("returns null for empty / invalid", () => {
    expect(normalizeReferrer(null)).toBeNull();
    expect(normalizeReferrer("not a url")).toBeNull();
  });
});

describe("normalizePath", () => {
  it("strips query and hash", () => {
    expect(normalizePath("/blog?utm=x#top")).toBe("/blog");
  });
  it("collapses trailing slash except root", () => {
    expect(normalizePath("/about/")).toBe("/about");
    expect(normalizePath("/")).toBe("/");
  });
});

describe("bot detection", () => {
  it("flags known crawlers and missing UA", () => {
    expect(isBot("Googlebot/2.1")).toBe(true);
    expect(isBot(null)).toBe(true);
    expect(isBot(undefined)).toBe(true);
  });
  it("passes a real browser UA", () => {
    expect(
      isBot(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      ),
    ).toBe(false);
  });
});

describe("user-agent parsing", () => {
  it("identifies a desktop Chrome client", () => {
    const ua = parseUA(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
    );
    expect(ua.browser).toBe("Chrome");
    expect(ua.os).toBe("Windows");
    expect(ua.deviceType).toBe("desktop");
  });

  it("identifies an iPhone as mobile", () => {
    const ua = parseUA(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    );
    expect(ua.deviceType).toBe("mobile");
    expect(ua.os).toBe("iOS");
  });
});
