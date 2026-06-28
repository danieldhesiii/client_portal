import { z } from "zod";
import type { EventType } from "@prisma/client";

/** Wire schema for the tracker payload. Lenient but bounded to resist abuse. */
export const collectSchema = z.object({
  siteId: z.string().min(1).max(64),
  type: z
    .enum(["pageview", "heartbeat", "session_end", "error"])
    .default("pageview"),
  sessionId: z.string().min(1).max(64),
  path: z.string().min(1).max(2048),
  referrer: z.string().max(2048).nullish(),
  utmSource: z.string().max(255).nullish(),
  utmMedium: z.string().max(255).nullish(),
  utmCampaign: z.string().max(255).nullish(),
  screenWidth: z.number().int().positive().max(20000).nullish(),
  language: z.string().max(35).nullish(),
  durationMs: z.number().int().nonnegative().max(86_400_000).nullish(),
  // Real-user monitoring fields, only sent with type "error".
  errorKind: z.enum(["resource", "fetch", "js"]).nullish(),
  errorHost: z.string().max(255).nullish(),
  errorMessage: z.string().max(500).nullish(),
});

export type CollectPayload = z.infer<typeof collectSchema>;

const TYPE_MAP: Record<CollectPayload["type"], EventType> = {
  pageview: "PAGEVIEW",
  heartbeat: "HEARTBEAT",
  session_end: "SESSION_END",
  error: "ERROR",
};

export function toEventType(t: CollectPayload["type"]): EventType {
  return TYPE_MAP[t];
}

/**
 * Normalise a referrer to its hostname for cleaner "traffic source" grouping.
 * Internal referrers (same host as the tracked path) and empty values collapse
 * to null so they read as "Direct" in the dashboard.
 */
export function normalizeReferrer(
  referrer: string | null | undefined,
): string | null {
  if (!referrer) return null;
  try {
    const url = new URL(referrer);
    return url.hostname.replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

/** Trim a path's query string / hash for stable "top pages" grouping. */
export function normalizePath(path: string): string {
  try {
    const clean = path.split("#")[0].split("?")[0];
    if (!clean) return "/";
    // Collapse trailing slash (except root) for consistent grouping.
    return clean.length > 1 ? clean.replace(/\/+$/, "") || "/" : clean;
  } catch {
    return "/";
  }
}
