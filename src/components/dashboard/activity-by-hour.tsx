import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { formatNumber } from "@/lib/utils";

const HOUR_LABELS = [0, 6, 12, 18];

/**
 * A 24-bar "when are visitors active" chart. Takes pageview counts per hour of
 * day (0–23, UTC) and draws a simple bar-per-hour, the tallest bar highlighted
 * as the peak. Pure presentational — safe to render on the server.
 */
export function ActivityByHour({ data }: { data: number[] }) {
  const max = data.reduce((m, v) => Math.max(m, v), 0);
  const total = data.reduce((s, v) => s + v, 0);
  const peakHour = max > 0 ? data.indexOf(max) : -1;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Activity by hour (UTC)</CardTitle>
        {peakHour >= 0 && (
          <span className="text-xs text-muted-foreground">
            Peak {String(peakHour).padStart(2, "0")}:00
          </span>
        )}
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <EmptyState title="No activity yet" />
        ) : (
          <>
            <div className="flex h-40 items-end gap-[3px]">
              {data.map((value, hour) => (
                <div
                  key={hour}
                  className="group relative flex h-full flex-1 items-end"
                >
                  <div
                    className="w-full rounded-sm transition-colors"
                    style={{
                      height: `${max ? Math.max((value / max) * 100, 2) : 2}%`,
                      backgroundColor:
                        hour === peakHour
                          ? "var(--accent)"
                          : "color-mix(in oklab, var(--accent) 35%, transparent)",
                    }}
                  />
                  <span className="pointer-events-none absolute -top-7 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-card px-2 py-1 text-xs shadow-sm group-hover:block">
                    {String(hour).padStart(2, "0")}:00 ·{" "}
                    {formatNumber(value)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-xs text-muted-foreground tabular">
              {HOUR_LABELS.map((h) => (
                <span key={h}>{String(h).padStart(2, "0")}:00</span>
              ))}
              <span>23:00</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
