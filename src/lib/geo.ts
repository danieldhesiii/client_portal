import { existsSync } from "fs";
import path from "path";
import { open, type Reader, type CityResponse } from "maxmind";

/**
 * Offline IP → approximate location lookup using a MaxMind GeoLite2-City
 * database. We only ever read coarse, location-only fields (country / region /
 * city) and immediately discard the IP. No paid geo API is used.
 *
 * The .mmdb file is licensed and not committed. If it is absent (e.g. fresh
 * clone, or local dev without the file) lookups return nulls gracefully so the
 * pipeline keeps working.
 */

export type GeoResult = {
  country: string | null;
  region: string | null;
  city: string | null;
};

const EMPTY: GeoResult = { country: null, region: null, city: null };

let readerPromise: Promise<Reader<CityResponse> | null> | null = null;

function dbPath(): string {
  return (
    process.env.GEOLITE2_DB_PATH ??
    path.join(process.cwd(), "geo", "GeoLite2-City.mmdb")
  );
}

async function getReader(): Promise<Reader<CityResponse> | null> {
  if (readerPromise) return readerPromise;
  readerPromise = (async () => {
    const file = dbPath();
    if (!existsSync(file)) {
      console.warn(
        `[geo] GeoLite2 database not found at ${file}. Geo lookups disabled.`,
      );
      return null;
    }
    try {
      return await open<CityResponse>(file);
    } catch (err) {
      console.error("[geo] Failed to open GeoLite2 database:", err);
      return null;
    }
  })();
  return readerPromise;
}

/** Look up approximate location for an IP. Never throws; returns nulls on miss. */
export async function lookupGeo(ip: string | null): Promise<GeoResult> {
  if (!ip || ip === "::1" || ip === "127.0.0.1") return EMPTY;
  const reader = await getReader();
  if (!reader) return EMPTY;
  try {
    const res = reader.get(ip);
    if (!res) return EMPTY;
    return {
      country: res.country?.names?.en ?? res.registered_country?.names?.en ?? null,
      region: res.subdivisions?.[0]?.names?.en ?? null,
      city: res.city?.names?.en ?? null,
    };
  } catch {
    return EMPTY;
  }
}
