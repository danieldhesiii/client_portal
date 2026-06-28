import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  collectSchema,
  toEventType,
  normalizeReferrer,
  normalizePath,
} from "@/lib/collect";
import { computeVisitorId } from "@/lib/privacy";
import { lookupGeo } from "@/lib/geo";
import { parseUA, isBot } from "@/lib/ua";
import { getClientIp } from "@/lib/request-ip";
import { rateLimit } from "@/lib/rate-limit";

// This route runs on third-party sites cross-origin, and needs Node APIs
// (crypto, fs for the geo db), so force the Node.js runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The tracker is embedded on arbitrary client sites and beacons are sent with
// navigator.sendBeacon, which the browser always sends with credentials mode
// "include". Browsers reject a wildcard `Access-Control-Allow-Origin: *` on any
// credentialed request, so we must reflect the caller's Origin and allow
// credentials. This endpoint is write-only and returns no data (only 204), so
// reflecting any origin carries no data-exposure risk.
function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  if (origin) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
      Vary: "Origin",
    };
  }
  // Non-browser / same-origin callers send no Origin header: wildcard is fine
  // and these requests are never credentialed.
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

// Resolve a site's publicId -> internal id with a short in-memory cache so the
// hot ingestion path doesn't hit the DB for every single event.
const siteCache = new Map<string, { id: string | null; expires: number }>();
const SITE_TTL = 60_000;

async function resolveSiteId(publicId: string): Promise<string | null> {
  const now = Date.now();
  const cached = siteCache.get(publicId);
  if (cached && cached.expires > now) return cached.id;
  const site = await prisma.site.findUnique({
    where: { publicId },
    select: { id: true },
  });
  siteCache.set(publicId, { id: site?.id ?? null, expires: now + SITE_TTL });
  return site?.id ?? null;
}

export function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

export async function POST(req: Request) {
  const cors = corsHeaders(req);
  // Always answer 204 on the happy path; analytics ingestion should be opaque
  // to the host site and never surface errors to visitors.
  try {
    const userAgent = req.headers.get("user-agent");
    if (isBot(userAgent)) {
      return new NextResponse(null, { status: 204, headers: cors });
    }

    const ip = getClientIp(req);

    // Rate limit per (ip) to blunt abuse without blocking shared NATs too hard.
    const rl = rateLimit(`collect:${ip ?? "unknown"}`);
    if (!rl.ok) {
      return new NextResponse(null, { status: 429, headers: cors });
    }

    const json = await req.json().catch(() => null);
    const parsed = collectSchema.safeParse(json);
    if (!parsed.success) {
      return new NextResponse(null, { status: 204, headers: cors });
    }
    const data = parsed.data;

    const siteId = await resolveSiteId(data.siteId);
    if (!siteId) {
      // Unknown site — accept-and-drop so probing reveals nothing.
      return new NextResponse(null, { status: 204, headers: cors });
    }

    // Derive geo + visitor hash from the IP, then discard the IP entirely.
    const [geo] = await Promise.all([lookupGeo(ip)]);
    const visitorId = computeVisitorId({
      ip: ip ?? "unknown",
      userAgent: userAgent ?? "unknown",
      siteId,
    });
    const ua = parseUA(userAgent);

    await prisma.event.create({
      data: {
        siteId,
        type: toEventType(data.type),
        visitorId,
        sessionId: data.sessionId,
        path: normalizePath(data.path),
        referrer: normalizeReferrer(data.referrer),
        utmSource: data.utmSource ?? null,
        utmMedium: data.utmMedium ?? null,
        utmCampaign: data.utmCampaign ?? null,
        country: geo.country,
        region: geo.region,
        city: geo.city,
        browser: ua.browser,
        os: ua.os,
        deviceType: ua.deviceType,
        screenWidth: data.screenWidth ?? null,
        language: data.language ?? null,
        durationMs: data.durationMs ?? null,
        errorKind: data.type === "error" ? (data.errorKind ?? null) : null,
        errorHost: data.type === "error" ? (data.errorHost ?? null) : null,
        errorMessage: data.type === "error" ? (data.errorMessage ?? null) : null,
      },
    });

    return new NextResponse(null, { status: 204, headers: cors });
  } catch (err) {
    console.error("[collect] error:", err);
    // Still return 204 so the tracker never logs noise into host-site consoles.
    return new NextResponse(null, { status: 204, headers: cors });
  }
}
