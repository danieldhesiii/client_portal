import { subDays, startOfDay, differenceInCalendarDays } from "date-fns";

export type RangeKey = "today" | "24h" | "7d" | "30d" | "90d" | "custom";

export type DateRange = {
  key: RangeKey;
  from: Date;
  to: Date;
  /** The equally-sized immediately-preceding period, for trend comparisons. */
  prevFrom: Date;
  prevTo: Date;
  /** Whether the traffic chart should bucket by hour (short ranges) or day. */
  granularity: "hour" | "day";
};

export const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "24h", label: "24h" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
];

/** Resolve a range key (and optional custom bounds) into concrete dates. */
export function resolveRange(
  key: RangeKey,
  now = new Date(),
  custom?: { from: Date; to: Date },
): DateRange {
  let from: Date;
  let to = now;
  let granularity: "hour" | "day" = "day";

  switch (key) {
    case "today":
      from = startOfDay(now);
      granularity = "hour";
      break;
    case "24h":
      from = subDays(now, 1);
      granularity = "hour";
      break;
    case "7d":
      from = startOfDay(subDays(now, 6));
      granularity = "day";
      break;
    case "30d":
      from = startOfDay(subDays(now, 29));
      granularity = "day";
      break;
    case "90d":
      from = startOfDay(subDays(now, 89));
      granularity = "day";
      break;
    case "custom": {
      if (!custom) throw new Error("custom range requires from/to");
      from = custom.from;
      to = custom.to;
      granularity =
        differenceInCalendarDays(to, from) <= 2 ? "hour" : "day";
      break;
    }
  }

  const spanMs = to.getTime() - from.getTime();
  const prevTo = from;
  const prevFrom = new Date(from.getTime() - spanMs);

  return { key, from, to, prevFrom, prevTo, granularity };
}

export function parseRangeKey(value: string | null | undefined): RangeKey {
  const allowed: RangeKey[] = ["today", "24h", "7d", "30d", "90d", "custom"];
  return allowed.includes(value as RangeKey) ? (value as RangeKey) : "7d";
}
