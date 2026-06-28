import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { formatNumber, formatPercent } from "@/lib/utils";
import type { Breakdown } from "@/lib/data/analytics";

/**
 * Detailed breakdown table used on section sub-pages. Richer than the compact
 * dashboard BreakdownList: shows rank, a share-of-total percentage and a bar.
 */
export function DetailTable({
  title,
  items,
  labelHeader = "Name",
  valueHeader = "Views",
  emptyLabel = "No data yet",
  formatLabel,
}: {
  title: string;
  items: Breakdown[];
  labelHeader?: string;
  valueHeader?: string;
  emptyLabel?: string;
  formatLabel?: (label: string) => string;
}) {
  const total = items.reduce((s, i) => s + i.value, 0);
  const max = items.reduce((m, i) => Math.max(m, i.value), 0) || 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState title={emptyLabel} />
        ) : (
          <div className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-2 pb-2 text-xs uppercase tracking-wide text-muted-foreground">
              <span>{labelHeader}</span>
              <span className="flex gap-6">
                <span className="w-16 text-right">{valueHeader}</span>
                <span className="w-12 text-right">Share</span>
              </span>
            </div>
            <ul>
              {items.map((item, i) => (
                <li key={item.label} className="relative border-b border-border/60 last:border-0">
                  <div
                    className="absolute inset-y-0 left-0 bg-muted"
                    style={{ width: `${(item.value / max) * 100}%` }}
                    aria-hidden
                  />
                  <div className="relative flex items-center justify-between px-2 py-2 text-sm">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="w-4 shrink-0 text-xs text-muted-foreground tabular">
                        {i + 1}
                      </span>
                      <span className="truncate" title={item.label}>
                        {formatLabel ? formatLabel(item.label) : item.label}
                      </span>
                    </span>
                    <span className="flex shrink-0 gap-6 tabular">
                      <span className="w-16 text-right">
                        {formatNumber(item.value)}
                      </span>
                      <span className="w-12 text-right text-muted-foreground">
                        {total ? formatPercent(item.value / total) : "0%"}
                      </span>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
