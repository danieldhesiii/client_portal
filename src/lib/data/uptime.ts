import { prisma } from "@/lib/prisma";
import { assertSiteAccess, requireAdmin } from "./access";
import type { DateRange } from "@/lib/date-range";

/**
 * Uptime layer. Two data sources feed the Uptime section:
 *   1. Synthetic checks (UptimeCheck) — the cron pings each site's own URL and
 *      records availability + latency. Detects full-site downtime.
 *   2. Real-user monitoring (Event rows of type ERROR) — the tracker beacons
 *      failed resource/fetch loads, whose hostnames are the "components" a site
 *      depends on. Detects partial degradation real visitors actually hit.
 */

// --- synthetic checks (write path, called by the cron) ---------------------

function toUrl(domain: string): string {
  return /^https?:\/\//i.test(domain) ? domain : `https://${domain}`;
}

async function checkOne(siteId: string, domain: string): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  const started = Date.now();
  try {
    const res = await fetch(toUrl(domain), {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "VyloraX-UptimeBot/1.0" },
    });
    const responseMs = Date.now() - started;
    await prisma.uptimeCheck.create({
      data: {
        siteId,
        ok: res.status < 500,
        statusCode: res.status,
        responseMs,
        error: res.status >= 500 ? `HTTP ${res.status}` : null,
      },
    });
  } catch (err) {
    const error =
      err instanceof Error
        ? err.name === "AbortError"
          ? "Request timed out"
          : err.message
        : "Request failed";
    await prisma.uptimeCheck.create({
      data: { siteId, ok: false, error },
    });
  } finally {
    clearTimeout(timer);
  }
}

/** Ping every site once. Returns the number of sites checked. */
export async function runUptimeChecks(): Promise<number> {
  const sites = await prisma.site.findMany({
    select: { id: true, domain: true },
  });
  await Promise.all(sites.map((s) => checkOne(s.id, s.domain)));
  return sites.length;
}

// --- reads (dashboard) ------------------------------------------------------

export type UptimeStatus = "operational" | "down" | "unknown";

export type UptimeSummary = {
  status: UptimeStatus;
  uptimePct: number | null; // 0..1
  avgResponseMs: number | null;
  totalChecks: number;
  failedChecks: number;
  lastCheckedAt: Date | null;
  lastError: string | null;
};

export async function getUptimeSummary(
  siteId: string,
  range: DateRange,
): Promise<UptimeSummary> {
  // Uptime is an agency-only view; enforce it here too so the role check can't
  // be bypassed by any future caller, not just the (admin-gated) page.
  await requireAdmin();
  await assertSiteAccess(siteId);
  const { from, to } = range;
  const checks = await prisma.uptimeCheck.findMany({
    where: { siteId, checkedAt: { gte: from, lte: to } },
    orderBy: { checkedAt: "desc" },
    select: {
      ok: true,
      responseMs: true,
      error: true,
      statusCode: true,
      checkedAt: true,
    },
  });

  if (checks.length === 0) {
    return {
      status: "unknown",
      uptimePct: null,
      avgResponseMs: null,
      totalChecks: 0,
      failedChecks: 0,
      lastCheckedAt: null,
      lastError: null,
    };
  }

  const total = checks.length;
  const failed = checks.filter((c) => !c.ok).length;
  const okResponses = checks
    .filter((c) => c.ok && c.responseMs != null)
    .map((c) => c.responseMs as number);
  const avg = okResponses.length
    ? Math.round(okResponses.reduce((s, v) => s + v, 0) / okResponses.length)
    : null;
  const latest = checks[0];

  return {
    status: latest.ok ? "operational" : "down",
    uptimePct: (total - failed) / total,
    avgResponseMs: avg,
    totalChecks: total,
    failedChecks: failed,
    lastCheckedAt: latest.checkedAt,
    lastError: latest.ok
      ? null
      : (latest.error ?? `HTTP ${latest.statusCode ?? "?"}`),
  };
}

export type DayAvailability = { date: string; pct: number; checks: number };

/** Per-day availability over the range, for the status timeline. */
export async function getUptimeDaily(
  siteId: string,
  range: DateRange,
): Promise<DayAvailability[]> {
  await requireAdmin();
  await assertSiteAccess(siteId);
  const { from, to } = range;
  const rows = await prisma.$queryRaw<
    { day: Date; total: bigint; ok: bigint }[]
  >`
    SELECT date_trunc('day', "checkedAt") AS day,
           COUNT(*) AS total,
           COUNT(*) FILTER (WHERE "ok") AS ok
    FROM "UptimeCheck"
    WHERE "siteId" = ${siteId} AND "checkedAt" >= ${from} AND "checkedAt" <= ${to}
    GROUP BY day
    ORDER BY day ASC`;
  return rows.map((r) => ({
    date: new Date(r.day).toISOString(),
    pct: Number(r.total) ? Number(r.ok) / Number(r.total) : 0,
    checks: Number(r.total),
  }));
}

export type Incident = {
  checkedAt: Date;
  statusCode: number | null;
  responseMs: number | null;
  error: string | null;
};

/** Recent failed synthetic checks. */
export async function getUptimeIncidents(
  siteId: string,
  range: DateRange,
  limit = 10,
): Promise<Incident[]> {
  await requireAdmin();
  await assertSiteAccess(siteId);
  const { from, to } = range;
  return prisma.uptimeCheck.findMany({
    where: { siteId, ok: false, checkedAt: { gte: from, lte: to } },
    orderBy: { checkedAt: "desc" },
    take: limit,
    select: {
      checkedAt: true,
      statusCode: true,
      responseMs: true,
      error: true,
    },
  });
}

export type ComponentHealth = { host: string; failures: number; lastSeen: Date };

/** Hosts of failed resources/fetches seen by real users — the site's deps. */
export async function getComponentHealth(
  siteId: string,
  range: DateRange,
  limit = 12,
): Promise<ComponentHealth[]> {
  await requireAdmin();
  await assertSiteAccess(siteId);
  const { from, to } = range;
  const rows = await prisma.$queryRaw<
    { host: string; failures: bigint; lastseen: Date }[]
  >`
    SELECT "errorHost" AS host, COUNT(*) AS failures, MAX("timestamp") AS lastseen
    FROM "Event"
    WHERE "siteId" = ${siteId} AND "type" = 'ERROR'::"EventType"
      AND "errorKind" IN ('resource', 'fetch') AND "errorHost" IS NOT NULL
      AND "timestamp" >= ${from} AND "timestamp" <= ${to}
    GROUP BY host
    ORDER BY failures DESC
    LIMIT ${limit}`;
  return rows.map((r) => ({
    host: r.host,
    failures: Number(r.failures),
    lastSeen: new Date(r.lastseen),
  }));
}

export type ClientError = { message: string; count: number; lastSeen: Date };

/** Top uncaught JS errors reported by real users. */
export async function getClientErrors(
  siteId: string,
  range: DateRange,
  limit = 8,
): Promise<ClientError[]> {
  await requireAdmin();
  await assertSiteAccess(siteId);
  const { from, to } = range;
  const rows = await prisma.$queryRaw<
    { message: string | null; count: bigint; lastseen: Date }[]
  >`
    SELECT "errorMessage" AS message, COUNT(*) AS count, MAX("timestamp") AS lastseen
    FROM "Event"
    WHERE "siteId" = ${siteId} AND "type" = 'ERROR'::"EventType"
      AND "errorKind" = 'js' AND "errorMessage" IS NOT NULL
      AND "timestamp" >= ${from} AND "timestamp" <= ${to}
    GROUP BY message
    ORDER BY count DESC
    LIMIT ${limit}`;
  return rows
    .filter((r) => r.message)
    .map((r) => ({
      message: r.message as string,
      count: Number(r.count),
      lastSeen: new Date(r.lastseen),
    }));
}
