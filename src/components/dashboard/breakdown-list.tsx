import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { formatNumber } from "@/lib/utils";
import type { Breakdown } from "@/lib/data/analytics";

/**
 * A horizontal-bar breakdown list (top pages, referrers, countries, etc.).
 * Bars are a subtle muted fill behind each row — the Plausible/Vercel style.
 */
export function BreakdownList({
  title,
  items,
  emptyLabel = "No data yet",
  valueHeader = "Visitors",
  formatLabel,
  viewAllHref,
}: {
  title: string;
  items: Breakdown[];
  emptyLabel?: string;
  valueHeader?: string;
  formatLabel?: (label: string) => string;
  viewAllHref?: string;
}) {
  const max = items.reduce((m, i) => Math.max(m, i.value), 0) || 1;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        {viewAllHref ? (
          <Link
            href={viewAllHref}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            View all <ArrowRight size={12} />
          </Link>
        ) : (
          items.length > 0 && (
            <span className="text-xs text-muted-foreground">{valueHeader}</span>
          )
        )}
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState title={emptyLabel} />
        ) : (
          <ul className="space-y-1">
            {items.map((item) => (
              <li key={item.label} className="relative">
                <div
                  className="absolute inset-y-0 left-0 rounded bg-muted"
                  style={{ width: `${(item.value / max) * 100}%` }}
                  aria-hidden
                />
                <div className="relative flex items-center justify-between px-2 py-1.5 text-sm">
                  <span className="truncate pr-3" title={item.label}>
                    {formatLabel ? formatLabel(item.label) : item.label}
                  </span>
                  <span className="tabular text-muted-foreground">
                    {formatNumber(item.value)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
