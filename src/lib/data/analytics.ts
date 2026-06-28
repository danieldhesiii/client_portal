import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertSiteAccess } from "./access";
import type { DateRange } from "@/lib/date-range";
import { eachHourOfInterval, eachDayOfInterval, startOfDay, startOfHour } from "date-fns";

/**
 * Analytics read layer. Every exported function calls `assertSiteAccess(siteId)`
 * first, so a CLIENT can never query a site outside their organization even if
 * they forge a siteId. Queries run against raw Event rows for accuracy; the
 * DailyStat rollups (see rollup.ts) back the longer-range performance path.
 */

export type Stat = { value: number; previous: number };

export type OverviewStats = {
  visitors: Stat;
  pageviews: Stat;
  avgDurationMs: Stat;
  bounceRate: Stat; // 0..1
};

export type TimeseriesPoint = { time: string; visitors: number; pageviews: number };

export type Breakdown = { label: string; value: number };

// --- helpers ---------------------------------------------------------------

function rangeWhere(siteId: string, from: Date, to: Date): Prisma.Sql {
  return Prisma.sql`"siteId" = ${siteId} AND "type" = 'PAGEVIEW'::"EventType" AND "timestamp" >= ${from} AND "timestamp" <= ${to}`;
}

async function uniqueVisitors(siteId: string, from: Date, to: Date): Promise<number> {
  const rows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(DISTINCT "visitorId") AS count
    FROM "Event"
    WHERE ${rangeWhere(siteId, from, to)}`;
  return Number(rows[0]?.count ?? 0);
}

async function pageviewCount(siteId: string, from: Date, to: Date): Promise<number> {
  return prisma.event.count({
    where: { siteId, type: "PAGEVIEW", timestamp: { gte: from, lte: to } },
  });
}

async function avgDuration(siteId: string, from: Date, to: Date): Promise<number> {
  const rows = await prisma.$queryRaw<{ avg: number | null }[]>`
    SELECT AVG("durationMs")::float AS avg
    FROM "Event"
    WHERE "siteId" = ${siteId}
      AND "type" = 'SESSION_END'::"EventType"
      AND "durationMs" IS NOT NULL
      AND "timestamp" >= ${from} AND "timestamp" <= ${to}`;
  return Math.round(rows[0]?.avg ?? 0);
}

async function bounceRate(siteId: string, from: Date, to: Date): Promise<number> {
  // A "bounce" is a session with exactly one pageview.
  const rows = await prisma.$queryRaw<{ sessions: bigint; bounces: bigint }[]>`
    SELECT
      COUNT(*) AS sessions,
      COUNT(*) FILTER (WHERE views = 1) AS bounces
    FROM (
      SELECT "sessionId", COUNT(*) AS views
      FROM "Event"
      WHERE ${rangeWhere(siteId, from, to)}
      GROUP BY "sessionId"
    ) s`;
  const sessions = Number(rows[0]?.sessions ?? 0);
  const bounces = Number(rows[0]?.bounces ?? 0);
  return sessions === 0 ? 0 : bounces / sessions;
}

// --- public API ------------------------------------------------------------

export async function getOverviewStats(
  siteId: string,
  range: DateRange,
): Promise<OverviewStats> {
  await assertSiteAccess(siteId);
  const { from, to, prevFrom, prevTo } = range;

  const [
    visitors,
    prevVisitors,
    pageviews,
    prevPageviews,
    dur,
    prevDur,
    bounce,
    prevBounce,
  ] = await Promise.all([
    uniqueVisitors(siteId, from, to),
    uniqueVisitors(siteId, prevFrom, prevTo),
    pageviewCount(siteId, from, to),
    pageviewCount(siteId, prevFrom, prevTo),
    avgDuration(siteId, from, to),
    avgDuration(siteId, prevFrom, prevTo),
    bounceRate(siteId, from, to),
    bounceRate(siteId, prevFrom, prevTo),
  ]);

  return {
    visitors: { value: visitors, previous: prevVisitors },
    pageviews: { value: pageviews, previous: prevPageviews },
    avgDurationMs: { value: dur, previous: prevDur },
    bounceRate: { value: bounce, previous: prevBounce },
  };
}

export async function getTimeseries(
  siteId: string,
  range: DateRange,
): Promise<TimeseriesPoint[]> {
  await assertSiteAccess(siteId);
  const { from, to, granularity } = range;
  const unit = granularity === "hour" ? "hour" : "day";

  const rows = await prisma.$queryRaw<
    { bucket: Date; pageviews: bigint; visitors: bigint }[]
  >`
    SELECT
      date_trunc(${unit}, "timestamp") AS bucket,
      COUNT(*) AS pageviews,
      COUNT(DISTINCT "visitorId") AS visitors
    FROM "Event"
    WHERE ${rangeWhere(siteId, from, to)}
    GROUP BY bucket
    ORDER BY bucket ASC`;

  const map = new Map<number, { pageviews: number; visitors: number }>();
  for (const r of rows) {
    map.set(new Date(r.bucket).getTime(), {
      pageviews: Number(r.pageviews),
      visitors: Number(r.visitors),
    });
  }

  // Zero-fill so the chart has a continuous axis.
  const buckets =
    granularity === "hour"
      ? eachHourOfInterval({ start: startOfHour(from), end: to })
      : eachDayOfInterval({ start: startOfDay(from), end: to });

  return buckets.map((b) => {
    const hit = map.get(b.getTime());
    return {
      time: b.toISOString(),
      pageviews: hit?.pageviews ?? 0,
      visitors: hit?.visitors ?? 0,
    };
  });
}

/** Generic top-N breakdown for a single column, ignoring null/empty values. */
async function breakdownBy(
  siteId: string,
  range: DateRange,
  column: Prisma.Sql,
  limit = 8,
): Promise<Breakdown[]> {
  const { from, to } = range;
  const rows = await prisma.$queryRaw<{ label: string | null; value: bigint }[]>`
    SELECT ${column} AS label, COUNT(*) AS value
    FROM "Event"
    WHERE ${rangeWhere(siteId, from, to)}
    GROUP BY label
    ORDER BY value DESC
    LIMIT ${limit + 5}`;
  return rows
    .filter((r) => r.label != null && r.label !== "")
    .slice(0, limit)
    .map((r) => ({ label: r.label as string, value: Number(r.value) }));
}

export async function getTopPages(siteId: string, range: DateRange, limit = 8) {
  await assertSiteAccess(siteId);
  return breakdownBy(siteId, range, Prisma.sql`"path"`, limit);
}

export async function getReferrers(siteId: string, range: DateRange, limit = 8) {
  await assertSiteAccess(siteId);
  return breakdownBy(siteId, range, Prisma.sql`"referrer"`, limit);
}

export async function getUtmSources(siteId: string, range: DateRange, limit = 8) {
  await assertSiteAccess(siteId);
  return breakdownBy(siteId, range, Prisma.sql`"utmSource"`, limit);
}

export async function getUtmMediums(siteId: string, range: DateRange, limit = 8) {
  await assertSiteAccess(siteId);
  return breakdownBy(siteId, range, Prisma.sql`"utmMedium"`, limit);
}

export async function getUtmCampaigns(siteId: string, range: DateRange, limit = 8) {
  await assertSiteAccess(siteId);
  return breakdownBy(siteId, range, Prisma.sql`"utmCampaign"`, limit);
}

export async function getCountries(siteId: string, range: DateRange, limit = 8) {
  await assertSiteAccess(siteId);
  return breakdownBy(siteId, range, Prisma.sql`"country"`, limit);
}

export async function getCities(siteId: string, range: DateRange, limit = 8) {
  await assertSiteAccess(siteId);
  return breakdownBy(siteId, range, Prisma.sql`"city"`, limit);
}

export async function getBrowsers(siteId: string, range: DateRange, limit = 8) {
  await assertSiteAccess(siteId);
  return breakdownBy(siteId, range, Prisma.sql`"browser"`, limit);
}

export async function getOperatingSystems(siteId: string, range: DateRange, limit = 8) {
  await assertSiteAccess(siteId);
  return breakdownBy(siteId, range, Prisma.sql`"os"`, limit);
}

export async function getDeviceTypes(siteId: string, range: DateRange, limit = 8) {
  await assertSiteAccess(siteId);
  return breakdownBy(siteId, range, Prisma.sql`"deviceType"::text`, limit);
}

export async function getLanguages(siteId: string, range: DateRange, limit = 8) {
  await assertSiteAccess(siteId);
  return breakdownBy(siteId, range, Prisma.sql`"language"`, limit);
}

/**
 * Top entry ("ASC") or exit ("DESC") pages: the first/last pageview path of
 * each session. `DISTINCT ON ("sessionId")` keeps one row per session ordered
 * by time, then we count those paths. Ties broken by id so the pick is stable.
 */
async function sessionEdgePages(
  siteId: string,
  range: DateRange,
  order: "ASC" | "DESC",
  limit: number,
): Promise<Breakdown[]> {
  const { from, to } = range;
  const dir = order === "ASC" ? Prisma.sql`ASC` : Prisma.sql`DESC`;
  const rows = await prisma.$queryRaw<{ label: string; value: bigint }[]>`
    SELECT label, COUNT(*) AS value
    FROM (
      SELECT DISTINCT ON ("sessionId") "path" AS label
      FROM "Event"
      WHERE ${rangeWhere(siteId, from, to)}
      ORDER BY "sessionId", "timestamp" ${dir}, "id" ${dir}
    ) edges
    GROUP BY label
    ORDER BY value DESC
    LIMIT ${limit}`;
  return rows.map((r) => ({ label: r.label, value: Number(r.value) }));
}

export async function getEntryPages(siteId: string, range: DateRange, limit = 8) {
  await assertSiteAccess(siteId);
  return sessionEdgePages(siteId, range, "ASC", limit);
}

export async function getExitPages(siteId: string, range: DateRange, limit = 8) {
  await assertSiteAccess(siteId);
  return sessionEdgePages(siteId, range, "DESC", limit);
}

/** Visitors bucketed into responsive breakpoints by reported screen width. */
export async function getScreenSizes(
  siteId: string,
  range: DateRange,
): Promise<Breakdown[]> {
  await assertSiteAccess(siteId);
  const { from, to } = range;
  const rows = await prisma.$queryRaw<{ label: string; value: bigint }[]>`
    SELECT
      CASE
        WHEN "screenWidth" < 640 THEN 'Mobile'
        WHEN "screenWidth" < 1024 THEN 'Tablet'
        WHEN "screenWidth" < 1440 THEN 'Laptop'
        ELSE 'Desktop'
      END AS label,
      COUNT(*) AS value
    FROM "Event"
    WHERE ${rangeWhere(siteId, from, to)} AND "screenWidth" IS NOT NULL
    GROUP BY label
    ORDER BY value DESC`;
  return rows.map((r) => ({ label: r.label, value: Number(r.value) }));
}

export type Engagement = {
  sessions: number;
  pagesPerSession: number;
  avgSessionMs: number;
  bounceRate: number; // 0..1
};

/** Session-level engagement metrics for the Behavior section. */
export async function getEngagement(
  siteId: string,
  range: DateRange,
): Promise<Engagement> {
  await assertSiteAccess(siteId);
  const { from, to } = range;
  const [rows, dur, bounce] = await Promise.all([
    prisma.$queryRaw<{ sessions: bigint; pageviews: bigint }[]>`
      SELECT COUNT(DISTINCT "sessionId") AS sessions, COUNT(*) AS pageviews
      FROM "Event"
      WHERE ${rangeWhere(siteId, from, to)}`,
    avgDuration(siteId, from, to),
    bounceRate(siteId, from, to),
  ]);
  const sessions = Number(rows[0]?.sessions ?? 0);
  const pageviews = Number(rows[0]?.pageviews ?? 0);
  return {
    sessions,
    pagesPerSession: sessions === 0 ? 0 : pageviews / sessions,
    avgSessionMs: dur,
    bounceRate: bounce,
  };
}

/** Pageviews per hour-of-day (0–23, UTC) — a 24-length array for the heatbar. */
export async function getActivityByHour(
  siteId: string,
  range: DateRange,
): Promise<number[]> {
  await assertSiteAccess(siteId);
  const { from, to } = range;
  const rows = await prisma.$queryRaw<{ hour: number; value: bigint }[]>`
    SELECT EXTRACT(HOUR FROM "timestamp")::int AS hour, COUNT(*) AS value
    FROM "Event"
    WHERE ${rangeWhere(siteId, from, to)}
    GROUP BY hour
    ORDER BY hour`;
  const buckets = Array.from({ length: 24 }, () => 0);
  for (const r of rows) buckets[r.hour] = Number(r.value);
  return buckets;
}

export type DashboardSummary = {
  visitors: number;
  pageviews: number;
  pages: number;
  referrers: number;
  countries: number;
  browsers: number;
  sessions: number;
  languages: number;
  errors: number;
  active: number;
};

/**
 * Compact per-section counts powering the left section-nav summaries. Kept to
 * two scans (one over the range, one over the last 5 min) so it's cheap enough
 * to fetch on every nav render.
 */
export async function getDashboardSummary(
  siteId: string,
  range: DateRange,
): Promise<DashboardSummary> {
  await assertSiteAccess(siteId);
  const { from, to } = range;

  const [agg, errorsRow, live] = await Promise.all([
    prisma.$queryRaw<
      {
        pageviews: bigint;
        visitors: bigint;
        pages: bigint;
        referrers: bigint;
        countries: bigint;
        browsers: bigint;
        sessions: bigint;
        languages: bigint;
      }[]
    >`
      SELECT
        COUNT(*) AS pageviews,
        COUNT(DISTINCT "visitorId") AS visitors,
        COUNT(DISTINCT "path") AS pages,
        COUNT(DISTINCT "referrer") AS referrers,
        COUNT(DISTINCT "country") AS countries,
        COUNT(DISTINCT "browser") AS browsers,
        COUNT(DISTINCT "sessionId") AS sessions,
        COUNT(DISTINCT "language") AS languages
      FROM "Event"
      WHERE ${rangeWhere(siteId, from, to)}`,
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) AS count
      FROM "Event"
      WHERE "siteId" = ${siteId} AND "type" = 'ERROR'::"EventType"
        AND "timestamp" >= ${from} AND "timestamp" <= ${to}`,
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(DISTINCT "visitorId") AS count
      FROM "Event"
      WHERE "siteId" = ${siteId} AND "timestamp" >= ${new Date(Date.now() - 5 * 60 * 1000)}`,
  ]);

  const a = agg[0];
  return {
    pageviews: Number(a?.pageviews ?? 0),
    visitors: Number(a?.visitors ?? 0),
    pages: Number(a?.pages ?? 0),
    referrers: Number(a?.referrers ?? 0),
    countries: Number(a?.countries ?? 0),
    browsers: Number(a?.browsers ?? 0),
    sessions: Number(a?.sessions ?? 0),
    languages: Number(a?.languages ?? 0),
    errors: Number(errorsRow[0]?.count ?? 0),
    active: Number(live[0]?.count ?? 0),
  };
}

/** Visitors active in the last 5 minutes, plus a small live page breakdown. */
export async function getRealtime(siteId: string) {
  await assertSiteAccess(siteId);
  const since = new Date(Date.now() - 5 * 60 * 1000);

  const [visitorsRow, topPages] = await Promise.all([
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(DISTINCT "visitorId") AS count
      FROM "Event"
      WHERE "siteId" = ${siteId} AND "timestamp" >= ${since}`,
    prisma.$queryRaw<{ label: string; value: bigint }[]>`
      SELECT "path" AS label, COUNT(DISTINCT "visitorId") AS value
      FROM "Event"
      WHERE "siteId" = ${siteId} AND "type" = 'PAGEVIEW'::"EventType"
        AND "timestamp" >= ${since}
      GROUP BY "path"
      ORDER BY value DESC
      LIMIT 6`,
  ]);

  return {
    activeVisitors: Number(visitorsRow[0]?.count ?? 0),
    topPages: topPages.map((r) => ({ label: r.label, value: Number(r.value) })),
  };
}
