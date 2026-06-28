import type { RangeKey } from "./date-range";

/** Build a dashboard section URL preserving the selected site + range. */
export function sectionHref(
  path: string,
  siteId: string,
  range: RangeKey,
): string {
  const params = new URLSearchParams();
  params.set("site", siteId);
  params.set("range", range);
  return `${path}?${params.toString()}`;
}
