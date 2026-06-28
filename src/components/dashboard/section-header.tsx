import { RangePicker } from "@/components/dashboard/range-picker";
import type { RangeKey } from "@/lib/date-range";

/** Shared header for dashboard sections: site name/domain + the range picker. */
export function SectionHeader({
  title,
  site,
  rangeKey,
}: {
  title: string;
  site: { name: string; domain: string };
  rangeKey: RangeKey;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">
          {site.name} · {site.domain}
        </p>
      </div>
      <RangePicker current={rangeKey} />
    </div>
  );
}
