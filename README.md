# Vylora X — Client Analytics Portal

A multi-tenant, **privacy-first** website analytics platform. Each client logs
in and sees analytics for their own site(s) in a clean, Vercel-style dashboard.
Drop a tiny script tag on any website — static HTML, WordPress, React, anything —
and it starts reporting.

Built with Next.js (App Router) + TypeScript, Prisma + PostgreSQL, Auth.js v5,
Tailwind v4, Recharts, and the Geist font.

---

## Table of contents

- [Architecture](#architecture)
- [Local setup](#local-setup)
- [Database: migrate & seed](#database-migrate--seed)
- [Running the app](#running-the-app)
- [Embedding the tracker](#embedding-the-tracker)
- [Geolocation (MaxMind GeoLite2)](#geolocation-maxmind-geolite2)
- [Privacy & compliance](#privacy--compliance-uk--gdpr)
- [Deploying to Vercel](#deploying-to-vercel)
- [Testing](#testing)
- [Project structure](#project-structure)

---

## Architecture

Three parts:

1. **Tracking snippet** — [`public/va.js`](public/va.js). Vanilla JS,
   no dependencies, < 3KB gzipped, cookieless. Captures page views + session
   data and beacons them to the ingestion endpoint, tagged with a `siteId`.
   SPA-aware (hooks `pushState`/`replaceState`/`popstate`), tracks session
   duration via heartbeats + a `sendBeacon` on page hide, and **fails silently**
   so it can never break the host site.

2. **Ingestion API** — [`/api/event`](src/app/api/event/route.ts). Validates
   the payload, derives approximate geo from the request IP, **anonymises the IP
   immediately** (a daily-rotating hash → `visitorId`), parses the user agent,
   filters bots, rate-limits, and stores a clean `Event`.

3. **Portal** — secure, role-based (`ADMIN` / `CLIENT`) multi-tenant web app.
   Admins manage clients/sites/logins and see everything; clients see only their
   own organization's sites.

### Data model (Prisma)

```
Organization 1──* Site 1──* Event
Organization 1──* User           (role: ADMIN | CLIENT)
Site         1──* DailyStat       (pre-aggregated daily rollups)
```

- **Event** — one row per pageview / heartbeat / session_end. Stores
  `visitorId` (hashed, never an IP), `sessionId`, path, referrer, UTM, approx
  geo, browser/OS/device, screen width, and session duration.
- **DailyStat** — per `(site, day)` rollup so historical ranges stay fast at
  volume. Built by the daily cron job ([`/api/cron/rollup`](src/app/api/cron/rollup/route.ts))
  and by the seed. Dashboards read raw `Event` rows for accuracy and realtime;
  rollups back the longer-range performance path.

### Tenant isolation

Every analytics query funnels through `assertSiteAccess(siteId)` in
[`src/lib/data/access.ts`](src/lib/data/access.ts). A `CLIENT` can only read
sites owned by their organization — enforced in the **data-access layer**, not
just the UI. Forging a `siteId` in the URL returns `403`.

---

## Local setup

**Prerequisites:** Node.js 20+ and a PostgreSQL database (local, or a free
[Neon](https://neon.tech) / [Supabase](https://supabase.com) instance).

```bash
# 1. Install dependencies
npm install

# 2. Create your env file and fill it in
cp .env.example .env
```

Set at minimum in `.env`:

| Variable               | Purpose                                              |
| ---------------------- | ---------------------------------------------------- |
| `DATABASE_URL`         | PostgreSQL connection string                         |
| `AUTH_SECRET`          | Auth.js session secret — `openssl rand -base64 32`   |
| `VISITOR_ID_SECRET`    | Salt base for the privacy-preserving visitor hash    |
| `NEXT_PUBLIC_APP_URL`  | Portal URL (used to build the embed snippet)         |

---

## Database: migrate & seed

```bash
# Create the schema (first run). Uses a migration history:
npm run db:migrate          # prisma migrate dev

#   …or, for a quick throwaway/dev DB without migration files:
npm run db:push             # prisma db push

# Seed an admin, a demo client + site, and ~30 days of realistic analytics:
npm run db:seed
```

The seed prints the demo credentials:

| Role   | Email                  | Password     |
| ------ | ---------------------- | ------------ |
| Admin  | `admin@vylorax.com`    | `admin1234`  |
| Client | `client@northwind.test`| `client1234` |

> Override the admin login with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.
> **Change these before any real deployment.**

---

## Running the app

```bash
npm run dev          # http://localhost:3000
```

1. Sign in as **admin** → you land on the dashboard, then open **Admin**.
2. Create a client (organization), add a **site**, and copy its **embed snippet**.
3. Create a **client login** assigned to that organization.
4. Sign in as that client → you see only that organization's site(s).

The seeded **Northwind Coffee** site already has data, so the dashboard looks
alive immediately (traffic chart, geography, devices, referrers, session
duration, and a populated realtime panel).

---

## Embedding the tracker

Paste this just before `</body>` on any page of the client's site (the snippet
is shown ready-to-copy in the Admin area per site):

```html
<script defer data-site="SITE_ID" src="https://portal.vylorax.com/va.js"></script>
```

- Works on any stack — static HTML, WordPress, React, Vue, etc.
- `defer` + async beacons mean **zero impact** on page load.
- Honors **Do Not Track** and skips `localhost` by default
  (add `data-track-localhost="true"` to test locally).
- SPA route changes are tracked automatically.

To test locally end-to-end: run the app, create a site, and drop the snippet
(pointing `src` at `http://localhost:3000/va.js`, with
`data-track-localhost="true"`) onto any local HTML page. Page views appear in
the dashboard within seconds, including in the realtime panel.

---

## Geolocation (MaxMind GeoLite2)

Geo is resolved **offline** from a local MaxMind GeoLite2-City database — no paid
API, and the IP is discarded immediately after lookup.

1. Create a free account at [maxmind.com](https://www.maxmind.com/en/geolite2/signup).
2. Download **GeoLite2-City.mmdb**.
3. Place it at `./geo/GeoLite2-City.mmdb` (or set `GEOLITE2_DB_PATH`).

If the file is absent (e.g. fresh clone), geo lookups are **skipped gracefully**
— everything else keeps working and `country`/`city` are stored as `null`. The
seed includes geography data regardless, so the dashboard demonstrates the
feature without the DB file.

---

## Privacy & compliance (UK / GDPR)

> **Not legal advice.** This describes the technical design. Get your own legal
> review before relying on it for compliance.

This platform is built to be **GDPR- and UK PECR-friendly**:

- **Cookieless.** The tracker sets no cookies and stores no persistent
  identifier on the visitor's device — only a per-tab `sessionStorage` id that
  is cleared when the tab closes.
- **No raw IPs are ever stored.** The IP is used transiently server-side to
  derive approximate location and a **non-reversible visitor hash**, then
  discarded. The hash is
  `sha256(daily-rotating-salt + siteId + ip + userAgent)` — countable as a
  unique visitor *within a day*, but it rotates every day so cross-day tracking
  is impossible and it cannot be tied back to a person (the Plausible/Fathom
  approach).
- **Aggregated, location-only geography.** We surface country / region / city,
  clearly labelled as approximate — never IP addresses.

Because no personal data is stored and no cookies/local storage are used for
tracking, this design **typically does not require a cookie-consent banner** for
analytics under PECR — but **confirm with your own legal advisor**.

### Placeholder privacy blurb for clients

A ready-to-customise notice your clients can show their visitors lives in
[`docs/privacy-blurb.md`](docs/privacy-blurb.md).

---

## Deploying to Vercel

1. Push this repo to GitHub and import it in Vercel.
2. Set environment variables (Project → Settings → Environment Variables):
   `DATABASE_URL`, `AUTH_SECRET`, `VISITOR_ID_SECRET`, `NEXT_PUBLIC_APP_URL`
   (your production URL), and optionally `CRON_SECRET` + `GEOLITE2_DB_PATH`.
3. Deploy. The daily rollup cron in [`vercel.json`](vercel.json) runs
   automatically. `prisma generate` runs on build via the `build` script.
4. Run migrations against your production DB once:
   `npx prisma migrate deploy` (or `prisma db push`).

No extra configuration is required. The `outputFileTracingIncludes` in
[`next.config.ts`](next.config.ts) bundles the `geo/` database into the
ingestion function if you commit/upload one.

---

## Testing

```bash
npm test            # vitest — schema validation, privacy hashing, date ranges
npm run typecheck   # tsc --noEmit
npm run build       # full production build (type-checks all routes)
```

The suite covers the ingestion payload validation, bot detection, user-agent
parsing, the privacy-preserving visitor hash (determinism within a day, rotation
across days, per-site separation, no raw IP leakage), and date-range math.

---

## Project structure

```
public/va.js              # the embeddable tracking snippet
prisma/
  schema.prisma                # data model
  seed.ts                      # admin + demo client + 30 days of data
src/
  app/
    (app)/                     # authenticated portal (layout requires login)
      dashboard/               # client analytics dashboard
      admin/                   # admin: clients, sites, logins, embed snippets
    api/
      event/                   # ingestion endpoint
      sites/[siteId]/realtime/ # realtime polling endpoint
      cron/rollup/             # daily aggregation job
      auth/[...nextauth]/      # Auth.js handlers
    login/                     # sign-in page
  components/                  # UI primitives + dashboard/admin components
  lib/
    auth/                      # Auth.js config, password hashing
    data/                      # access control + analytics + admin + rollups
    collect.ts geo.ts privacy.ts ua.ts rate-limit.ts date-range.ts
tests/                         # vitest unit tests
```
