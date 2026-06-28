import { ArrowDown, ArrowUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn, formatPercent, trend } from "@/lib/utils";

export function StatCard({
  label,
  value,
  previous,
  format = (n) => String(n),
  /** When true, a decrease is "good" (e.g. bounce rate). */
  lowerIsBetter = false,
}: {
  label: string;
  value: number;
  previous: number;
  format?: (n: number) => string;
  lowerIsBetter?: boolean;
}) {
  const t = trend(value, previous);
  const positive = t != null && t > 0;
  const good =
    t == null || t === 0 ? null : lowerIsBetter ? !positive : positive;

  return (
    <Card className="p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular tracking-tight">
        {format(value)}
      </p>
      <div className="mt-2 flex items-center gap-1.5 text-xs">
        {t == null ? (
          <span className="text-muted-foreground">No prior data</span>
        ) : (
          <>
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-medium",
                good == null
                  ? "text-muted-foreground"
                  : good
                    ? "text-[var(--success)]"
                    : "text-[var(--danger)]",
              )}
            >
              {positive ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
              {formatPercent(Math.abs(t))}
            </span>
            <span className="text-muted-foreground">vs previous period</span>
          </>
        )}
      </div>
    </Card>
  );
}
