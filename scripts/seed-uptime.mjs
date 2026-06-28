/**
 * Seed demo uptime + real-user error data for the first site so the Uptime
 * section looks alive without waiting for the cron. Idempotent: clears the
 * site's existing synthetic checks and ERROR events first.
 *
 * Run with: npm run db:seed:uptime
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

function randInt(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const site = await prisma.site.findFirst({ orderBy: { createdAt: "asc" } });
if (!site) {
  console.log("No site found — run the main seed first.");
  process.exit(0);
}
console.log(`Seeding uptime for ${site.name} (${site.domain})`);

// --- reset demo data --------------------------------------------------------
await prisma.uptimeCheck.deleteMany({ where: { siteId: site.id } });
await prisma.event.deleteMany({ where: { siteId: site.id, type: "ERROR" } });

// --- synthetic checks: every 30 min for 14 days -----------------------------
const now = Date.now();
const DAYS = 14;
const STEP = 30 * 60 * 1000;
// One ~50-minute outage 4 days ago.
const outageStart = now - 4 * 864e5;
const outageEnd = outageStart + 50 * 60 * 1000;

const checks = [];
for (let t = now - DAYS * 864e5; t <= now; t += STEP) {
  const inOutage = t >= outageStart && t <= outageEnd;
  // A little elevated latency in the hour before the outage.
  const nearOutage = t >= outageStart - 60 * 60 * 1000 && t < outageStart;
  if (inOutage) {
    checks.push({
      siteId: site.id,
      ok: false,
      statusCode: pick([503, 502, null]),
      responseMs: null,
      error: pick(["HTTP 503", "Request timed out", "HTTP 502"]),
      checkedAt: new Date(t),
    });
  } else {
    // Rare one-off blips outside the outage (~0.5%).
    const blip = Math.random() < 0.005;
    checks.push({
      siteId: site.id,
      ok: !blip,
      statusCode: blip ? 500 : 200,
      responseMs: blip ? null : randInt(nearOutage ? 600 : 110, nearOutage ? 1400 : 420),
      error: blip ? "HTTP 500" : null,
      checkedAt: new Date(t),
    });
  }
}
await prisma.uptimeCheck.createMany({ data: checks });
const failed = checks.filter((c) => !c.ok).length;
console.log(`  ✓ ${checks.length} checks (${failed} failed)`);

// --- real-user error events over the last 7 days ----------------------------
const RESOURCE_HOSTS = [
  "cdn.shopify.com",
  "fonts.gstatic.com",
  "connect.facebook.net",
  "js.stripe.com",
  "www.googletagmanager.com",
];
const FETCH_HOSTS = ["api.stripe.com", "api.mailchimp.com", "maps.googleapis.com"];
const JS_MESSAGES = [
  "TypeError: Cannot read properties of undefined (reading 'map')",
  "ReferenceError: gtag is not defined",
  "TypeError: Failed to fetch",
  "Uncaught (in promise) DOMException: The play() request was interrupted",
];
const PATHS = ["/", "/menu", "/locations", "/contact", "/blog/cold-brew-guide"];
const DEVICES = ["desktop", "mobile", "tablet"];

const errors = [];
for (let i = 0; i < 45; i++) {
  const kind = pick(["resource", "resource", "fetch", "js"]);
  const ts = new Date(now - randInt(0, 7 * 864e5));
  let errorHost = null;
  let errorMessage = null;
  if (kind === "resource") {
    errorHost = pick(RESOURCE_HOSTS);
    errorMessage = `IMG failed to load: https://${errorHost}/assets/${randInt(100, 999)}.js`;
  } else if (kind === "fetch") {
    errorHost = pick(FETCH_HOSTS);
    errorMessage = `HTTP ${pick([500, 502, 503])}: https://${errorHost}/v1/charges`;
  } else {
    errorMessage = pick(JS_MESSAGES);
  }
  errors.push({
    siteId: site.id,
    type: "ERROR",
    visitorId: `demo-err-${randInt(1, 9999)}`,
    sessionId: `demo-err-sess-${i}`,
    path: pick(PATHS),
    deviceType: pick(DEVICES),
    errorKind: kind,
    errorHost,
    errorMessage,
    timestamp: ts,
  });
}
await prisma.event.createMany({ data: errors });
console.log(`  ✓ ${errors.length} real-user error events`);

await prisma.$disconnect();
console.log("Done.");
