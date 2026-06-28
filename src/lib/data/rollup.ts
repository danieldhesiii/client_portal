import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";

/**
 * Daily aggregation job. Rolls raw Event rows for one (site, day) into a single
 * DailyStat row so historical dashboard ranges can be served from pre-computed
 * data instead of scanning every event. Idempotent — safe to re-run for a day.
 */

type CountMap = Record<string, number>;

function tally(map: CountMap, key: string | null | undefined) {
  if (!key) return;
  map[key] = (map[key] ?? 0) + 1;
}

export async function rollupSiteDay(siteId: string, day: Date): Promise<void> {
  const from = startOfDay(day);
  const to = endOfDay(day);

  const events = await prisma.event.findMany({
    where: { siteId, timestamp: { gte: from, lte: to } },
    select: {
      type: true,
      visitorId: true,
      sessionId: true,
      path: true,
      referrer: true,
      country: true,
      city: true,
      browser: true,
      os: true,
      deviceType: true,
      utmSource: true,
      durationMs: true,
    },
  });

  const visitors = new Set<string>();
  const sessions = new Map<string, number>(); // sessionId -> pageview count
  let pageviews = 0;
  let totalDurationMs = 0;

  const topPages: CountMap = {};
  const referrers: CountMap = {};
  const countries: CountMap = {};
  const cities: CountMap = {};
  const browsers: CountMap = {};
  const operatingSystems: CountMap = {};
  const deviceTypes: CountMap = {};
  const utmSources: CountMap = {};

  for (const e of events) {
    visitors.add(e.visitorId);
    if (e.type === "PAGEVIEW") {
      pageviews += 1;
      sessions.set(e.sessionId, (sessions.get(e.sessionId) ?? 0) + 1);
      tally(topPages, e.path);
      tally(referrers, e.referrer);
      tally(countries, e.country);
      tally(cities, e.city);
      tally(browsers, e.browser);
      tally(operatingSystems, e.os);
      tally(deviceTypes, e.deviceType);
      tally(utmSources, e.utmSource);
    }
    if (e.type === "SESSION_END" && e.durationMs) {
      totalDurationMs += e.durationMs;
    }
  }

  const bounces = [...sessions.values()].filter((v) => v === 1).length;

  await prisma.dailyStat.upsert({
    where: { siteId_date: { siteId, date: from } },
    create: {
      siteId,
      date: from,
      pageviews,
      visitors: visitors.size,
      sessions: sessions.size,
      bounces,
      totalDurationMs: BigInt(totalDurationMs),
      topPages,
      referrers,
      countries,
      cities,
      browsers,
      operatingSystems,
      deviceTypes,
      utmSources,
    },
    update: {
      pageviews,
      visitors: visitors.size,
      sessions: sessions.size,
      bounces,
      totalDurationMs: BigInt(totalDurationMs),
      topPages,
      referrers,
      countries,
      cities,
      browsers,
      operatingSystems,
      deviceTypes,
      utmSources,
    },
  });
}

/** Roll up every site for a given day (used by the cron route + seed). */
export async function rollupAllSites(day: Date): Promise<number> {
  const sites = await prisma.site.findMany({ select: { id: true } });
  for (const s of sites) {
    await rollupSiteDay(s.id, day);
  }
  return sites.length;
}
