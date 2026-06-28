"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RANGE_OPTIONS, type RangeKey } from "@/lib/date-range";
import { cn } from "@/lib/utils";

export function RangePicker({ current }: { current: RangeKey }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setRange(key: RangeKey) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", key);
    // Stay on the current section (Overview, Pages, Geography, …).
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="inline-flex items-center rounded-md border border-border bg-card p-0.5">
      {RANGE_OPTIONS.map((opt) => (
        <button
          key={opt.key}
          onClick={() => setRange(opt.key)}
          className={cn(
            "rounded px-2.5 py-1 text-xs font-medium transition-colors",
            current === opt.key
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
