"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";

type RealtimeData = {
  activeVisitors: number;
  topPages: { label: string; value: number }[];
};

/** Live "visitors in the last 5 minutes" panel; polls every 10s. */
export function Realtime({ siteId }: { siteId: string }) {
  const [data, setData] = useState<RealtimeData | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await fetch(`/api/sites/${siteId}/realtime`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const json = (await res.json()) as RealtimeData;
        if (active) setData(json);
      } catch {
        /* ignore transient errors */
      }
    }
    load();
    const id = setInterval(load, 10_000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [siteId]);

  const count = data?.activeVisitors ?? 0;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Realtime</CardTitle>
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--success)] opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--success)]" />
          </span>
          live
        </span>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold tabular tracking-tight">
            {formatNumber(count)}
          </span>
          <span className="text-sm text-muted-foreground">
            active in last 5 min
          </span>
        </div>

        {data && data.topPages.length > 0 && (
          <ul className="mt-4 space-y-1.5 border-t border-border pt-3">
            {data.topPages.map((p) => (
              <li
                key={p.label}
                className="flex items-center justify-between text-xs"
              >
                <span className="truncate pr-3 text-muted-foreground">
                  {p.label}
                </span>
                <span className="tabular">{formatNumber(p.value)}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
