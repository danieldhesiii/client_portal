/**
 * Seed script — creates an admin login, one demo client with a site, and ~30
 * days of realistic analytics so the dashboard looks alive immediately.
 *
 * Self-contained (no `@/` alias imports) so it runs cleanly under tsx. The
 * daily rollup is re-implemented inline to mirror src/lib/data/rollup.ts.
 *
 * Run with: npm run db:seed
 */
import { PrismaClient, Prisma, type DeviceType, type EventType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// --- demo data dimensions --------------------------------------------------
const PAGES = [
  { path: "/", weight: 30 },
  { path: "/menu", weight: 18 },
  { path: "/locations", weight: 14 },
  { path: "/about", weight: 10 },
  { path: "/blog/best-espresso", weight: 9 },
  { path: "/blog/cold-brew-guide", weight: 8 },
  { path: "/contact", weight: 6 },
  { path: "/careers", weight: 5 },
];
const REFERRERS = [
  null, null, null, // direct-heavy
  "google.com",
  "google.com",
  "facebook.com",
  "instagram.com",
  "t.co",
  "bing.com",
  "reddit.com",
];
const GEO = [
  { country: "United Kingdom", region: "England", city: "London" },
  { country: "United Kingdom", region: "Scotland", city: "Edinburgh" },
  { country: "United Kingdom", region: "England", city: "Manchester" },
  { country: "United States", region: "New York", city: "New York" },
  { country: "United States", region: "California", city: "San Francisco" },
  { country: "Germany", region: "Berlin", city: "Berlin" },
  { country: "France", region: "Île-de-France", city: "Paris" },
  { country: "Ireland", region: "Leinster", city: "Dublin" },
  { country: "Spain", region: "Catalonia", city: "Barcelona" },
  { country: "Netherlands", region: "North Holland", city: "Amsterdam" },
];
const BROWSERS = ["Chrome", "Chrome", "Chrome", "Safari", "Safari", "Firefox", "Edge"];
const OSES = ["iOS", "Android", "Windows", "macOS", "Windows", "macOS"];
const DEVICES: DeviceType[] = ["mobile", "mobile", "desktop", "desktop", "desktop", "tablet"];
const UTM: (string | null)[] = [null, null, null, null, "newsletter", "spring_sale", "instagram_bio"];
const LANGS = ["en-GB", "en-US", "de-DE", "fr-FR", "es-ES"];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function weightedPage(): string {
  const total = PAGES.reduce((s, p) => s + p.weight, 0);
  let r = Math.random() * total;
  for (const p of PAGES) {
    r -= p.weight;
    if (r <= 0) return p.path;
  }
  return PAGES[0].path;
}
function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  console.log("Seeding Vylora X portal…");

  // --- admin login ---------------------------------------------------------
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "admin@vylorax.com").toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "admin1234";
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: "Vylora X Admin",
      role: "ADMIN",
      passwordHash: await bcrypt.hash(adminPassword, 10),
    },
  });
  console.log(`  ✓ admin: ${adminEmail} / ${adminPassword}`);

  // --- demo client + site --------------------------------------------------
  const org = await prisma.organization.upsert({
    where: { id: "demo-northwind" },
    update: {},
    create: { id: "demo-northwind", name: "Northwind Coffee" },
  });

  const clientEmail = "client@northwind.test";
  await prisma.user.upsert({
    where: { email: clientEmail },
    update: { organizationId: org.id },
    create: {
      email: clientEmail,
      name: "Northwind Owner",
      role: "CLIENT",
      organizationId: org.id,
      passwordHash: await bcrypt.hash("client1234", 10),
    },
  });
  console.log(`  ✓ client: ${clientEmail} / client1234`);

  const site = await prisma.site.upsert({
    where: { publicId: "demo000northwind" },
    update: {},
    create: {
      publicId: "demo000northwind",
      name: "Northwind Coffee",
      domain: "northwindcoffee.com",
      organizationId: org.id,
    },
  });
  console.log(`  ✓ site: ${site.name} (publicId ${site.publicId})`);

  // --- clear prior demo events (idempotent reseed) -------------------------
  await prisma.event.deleteMany({ where: { siteId: site.id } });
  await prisma.dailyStat.deleteMany({ where: { siteId: site.id } });

  // --- generate ~30 days of events -----------------------------------------
  const now = new Date();
  const DAYS = 30;
  const rows: Prisma.EventCreateManyInput[] = [];

  for (let d = DAYS; d >= 0; d--) {
    const dayBase = new Date(now);
    dayBase.setDate(now.getDate() - d);
    // Gentle upward trend + weekend dip + noise.
    const trendFactor = 1 + (DAYS - d) * 0.015;
    const weekend = [0, 6].includes(dayBase.getDay()) ? 0.65 : 1;
    const visitorsToday = Math.round(randInt(40, 70) * trendFactor * weekend);

    for (let v = 0; v < visitorsToday; v++) {
      const visitorId = `seed-${d}-${v}-${randInt(1000, 9999)}`;
      const sessionId = `sess-${d}-${v}-${randInt(1000, 9999)}`;
      const geo = pick(GEO);
      const browser = pick(BROWSERS);
      const os = pick(OSES);
      const deviceType = pick(DEVICES);
      const referrer = pick(REFERRERS);
      const utmSource = pick(UTM);
      const language = pick(LANGS);
      const screenWidth = deviceType === "mobile" ? 390 : deviceType === "tablet" ? 820 : 1440;

      const pageCount = randInt(1, 5); // 1 => bounce
      const startMs =
        dayBase.setHours(randInt(7, 22), randInt(0, 59), randInt(0, 59), 0);
      let cursor = startMs;
      const shared = {
        siteId: site.id,
        visitorId,
        sessionId,
        referrer: referrer ?? null,
        utmSource: utmSource ?? null,
        utmMedium: utmSource ? "referral" : null,
        utmCampaign: utmSource ?? null,
        country: geo.country,
        region: geo.region,
        city: geo.city,
        browser,
        os,
        deviceType,
        screenWidth,
        language,
      };

      for (let p = 0; p < pageCount; p++) {
        cursor += randInt(8_000, 90_000); // time between pageviews
        rows.push({
          ...shared,
          type: "PAGEVIEW" as EventType,
          path: weightedPage(),
          timestamp: new Date(cursor),
        });
      }

      // Final session_end carrying total duration.
      const durationMs = cursor - startMs + randInt(2_000, 20_000);
      rows.push({
        ...shared,
        type: "SESSION_END" as EventType,
        path: "/",
        durationMs,
        timestamp: new Date(cursor + 1000),
      });
    }
  }

  // Sprinkle a few "right now" events so the realtime panel is non-empty.
  for (let i = 0; i < 7; i++) {
    const geo = pick(GEO);
    rows.push({
      siteId: site.id,
      type: "PAGEVIEW" as EventType,
      visitorId: `live-${i}-${randInt(1000, 9999)}`,
      sessionId: `live-sess-${i}`,
      path: weightedPage(),
      referrer: pick(REFERRERS) ?? null,
      country: geo.country,
      region: geo.region,
      city: geo.city,
      browser: pick(BROWSERS),
      os: pick(OSES),
      deviceType: pick(DEVICES),
      screenWidth: 1440,
      language: pick(LANGS),
      timestamp: new Date(Date.now() - randInt(5, 280) * 1000),
    });
  }

  // Batch insert.
  for (let i = 0; i < rows.length; i += 1000) {
    await prisma.event.createMany({ data: rows.slice(i, i + 1000) });
  }
  console.log(`  ✓ inserted ${rows.length} demo events`);

  // --- roll up each day into DailyStat -------------------------------------
  for (let d = DAYS; d >= 0; d--) {
    const day = new Date(now);
    day.setDate(now.getDate() - d);
    await rollupDay(site.id, day);
  }
  console.log("  ✓ built daily rollups");

  console.log("\nDone. Sign in at /login.");
}

// Inline mirror of src/lib/data/rollup.ts (kept dependency-free for tsx).
async function rollupDay(siteId: string, day: Date) {
  const from = new Date(day);
  from.setHours(0, 0, 0, 0);
  const to = new Date(day);
  to.setHours(23, 59, 59, 999);

  const events = await prisma.event.findMany({
    where: { siteId, timestamp: { gte: from, lte: to } },
    select: {
      type: true, visitorId: true, sessionId: true, path: true, referrer: true,
      country: true, city: true, browser: true, os: true, deviceType: true,
      utmSource: true, durationMs: true,
    },
  });

  const visitors = new Set<string>();
  const sessions = new Map<string, number>();
  let pageviews = 0;
  let totalDurationMs = 0;
  const maps: Record<string, Record<string, number>> = {
    topPages: {}, referrers: {}, countries: {}, cities: {},
    browsers: {}, operatingSystems: {}, deviceTypes: {}, utmSources: {},
  };
  const bump = (m: Record<string, number>, k: string | null | undefined) => {
    if (k) m[k] = (m[k] ?? 0) + 1;
  };

  for (const e of events) {
    visitors.add(e.visitorId);
    if (e.type === "PAGEVIEW") {
      pageviews++;
      sessions.set(e.sessionId, (sessions.get(e.sessionId) ?? 0) + 1);
      bump(maps.topPages, e.path);
      bump(maps.referrers, e.referrer);
      bump(maps.countries, e.country);
      bump(maps.cities, e.city);
      bump(maps.browsers, e.browser);
      bump(maps.operatingSystems, e.os);
      bump(maps.deviceTypes, e.deviceType);
      bump(maps.utmSources, e.utmSource);
    }
    if (e.type === "SESSION_END" && e.durationMs) totalDurationMs += e.durationMs;
  }
  const bounces = [...sessions.values()].filter((v) => v === 1).length;

  const payload = {
    pageviews, visitors: visitors.size, sessions: sessions.size, bounces,
    totalDurationMs: BigInt(totalDurationMs),
    topPages: maps.topPages, referrers: maps.referrers, countries: maps.countries,
    cities: maps.cities, browsers: maps.browsers, operatingSystems: maps.operatingSystems,
    deviceTypes: maps.deviceTypes, utmSources: maps.utmSources,
  };
  await prisma.dailyStat.upsert({
    where: { siteId_date: { siteId, date: from } },
    create: { siteId, date: from, ...payload },
    update: payload,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
