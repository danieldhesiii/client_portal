import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import type { DayAvailability } from "@/lib/data/uptime";

function colorFor(pct: number): string {
  if (pct >= 0.99) return "var(--success)";
  if (pct >= 0.95) return "#f5a623";
  return "var(--danger)";
}

/** Status-page style row of per-day availability cells. */
export function AvailabilityTimeline({ days }: { days: DayAvailability[] }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Daily availability</CardTitle>
        {days.length > 0 && (
          <span className="text-xs text-muted-foreground">
            last {days.length} day{days.length === 1 ? "" : "s"}
          </span>
        )}
      </CardHeader>
      <CardContent>
        {days.length === 0 ? (
          <EmptyState title="No checks recorded yet" />
        ) : (
          <>
            <div className="flex items-end gap-1">
              {days.map((d) => (
                <div key={d.date} className="group relative flex-1">
                  <div
                    className="h-10 w-full rounded-sm"
                    style={{ backgroundColor: colorFor(d.pct) }}
                  />
                  <span className="pointer-events-none absolute -top-10 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-card px-2 py-1 text-xs shadow-sm group-hover:block">
                    {format(new Date(d.date), "d MMM")} ·{" "}
                    {(d.pct * 100).toFixed(1)}% · {d.checks} checks
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>{format(new Date(days[0].date), "d MMM")}</span>
              <span>
                {format(new Date(days[days.length - 1].date), "d MMM")}
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
