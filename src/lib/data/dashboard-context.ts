import type { Site } from "@prisma/client";
import { listAccessibleSites } from "./access";
import {
  parseRangeKey,
  resolveRange,
  type DateRange,
  type RangeKey,
} from "@/lib/date-range";

export type DashboardContext = {
  sites: Site[];
  site: Site;
  rangeKey: RangeKey;
  range: DateRange;
};

/**
 * Resolves the site + date range every dashboard sub-page needs from the URL
 * search params (`?site=` and `?range=`). Returns null when the user has no
 * accessible sites, so pages can render the shared empty state. Falls back to
 * the user's first site when `?site=` is missing or not theirs — which also
 * doubles as the tenant guard (a forged id simply isn't in the list).
 */
export async function resolveDashboardContext(searchParams: {
  site?: string;
  range?: string;
}): Promise<DashboardContext | null> {
  const sites = await listAccessibleSites();
  if (sites.length === 0) return null;

  const site = sites.find((s) => s.id === searchParams.site) ?? sites[0];
  const rangeKey = parseRangeKey(searchParams.range);
  const range = resolveRange(rangeKey);

  return { sites, site, rangeKey, range };
}
