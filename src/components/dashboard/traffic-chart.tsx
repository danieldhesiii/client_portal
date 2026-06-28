"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format } from "date-fns";
import type { TimeseriesPoint } from "@/lib/data/analytics";
import { formatCompact } from "@/lib/utils";

export function TrafficChart({
  data,
  granularity,
}: {
  data: TimeseriesPoint[];
  granularity: "hour" | "day";
}) {
  const tickFmt = (iso: string) =>
    format(new Date(iso), granularity === "hour" ? "HH:mm" : "d MMM");

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="vxFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--border)"
          vertical={false}
        />
        <XAxis
          dataKey="time"
          tickFormatter={tickFmt}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          axisLine={false}
          tickLine={false}
          minTickGap={28}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          axisLine={false}
          tickLine={false}
          width={44}
          tickFormatter={(n) => formatCompact(Number(n))}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: "var(--muted-foreground)" }}
          labelFormatter={(iso) =>
            format(
              new Date(iso as string),
              granularity === "hour" ? "d MMM, HH:mm" : "EEE d MMM",
            )
          }
        />
        <Area
          type="monotone"
          dataKey="visitors"
          name="Visitors"
          stroke="var(--accent)"
          strokeWidth={2}
          fill="url(#vxFill)"
        />
        <Area
          type="monotone"
          dataKey="pageviews"
          name="Page views"
          stroke="var(--muted-foreground)"
          strokeWidth={1}
          strokeDasharray="4 3"
          fill="transparent"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
