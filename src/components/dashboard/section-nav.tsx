"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Activity,
  FileText,
  Globe,
  LayoutDashboard,
  MonitorSmartphone,
  Share2,
} from "lucide-react";
import type { DashboardSummary } from "@/lib/data/analytics";
import { cn, formatCompact } from "@/lib/utils";

export type NavSite = { id: string; name: string };

type Section = {
  href: string;
  label: string;
  icon: typeof Activity;
  metric: keyof DashboardSummary;
  suffix: string;
  live?: boolean;
};

const SECTIONS: Section[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, metric: "visitors", suffix: "visitors" },
  { href: "/dashboard/pages", label: "Pages", icon: FileText, metric: "pageviews", suffix: "views" },
  { href: "/dashboard/sources", label: "Sources", icon: Share2, metric: "referrers", suffix: "referrers" },
  { href: "/dashboard/geography", label: "Geography", icon: Globe, metric: "countries", suffix: "countries" },
  { href: "/dashboard/devices", label: "Devices", icon: MonitorSmartphone, metric: "browsers", suffix: "browsers" },
  { href: "/dashboard/realtime", label: "Realtime", icon: Activity, metric: "active", suffix: "active now", live: true },
];

export function SectionNav({ sites }: { sites: NavSite[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const siteId = searchParams.get("site") ?? sites[0]?.id ?? "";
  const range = searchParams.get("range") ?? "7d";

  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  useEffect(() => {
    if (!siteId) return;
    let active = true;
    async function load() {
      try {
        const res = await fetch(
          `/api/sites/${siteId}/summary?range=${range}`,
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const json = (await res.json()) as DashboardSummary;
        if (active) setSummary(json);
      } catch {
        /* ignore transient errors */
      }
    }
    load();
    // Refresh periodically so the "active now" figure stays live.
    const id = setInterval(load, 15_000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [siteId, range]);

  function hrefFor(href: string) {
    const params = new URLSearchParams();
    if (siteId) params.set("site", siteId);
    params.set("range", range);
    return `${href}?${params.toString()}`;
  }

  return (
    <nav
      aria-label="Dashboard sections"
      className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0"
    >
      {SECTIONS.map((s) => {
        const isActive =
          s.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname === s.href;
        const value = summary ? summary[s.metric] : null;
        const Icon = s.icon;

        return (
          <Link
            key={s.href}
            href={hrefFor(s.href)}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "group flex min-w-[140px] items-center gap-3 rounded-md border px-3 py-2 transition-colors lg:min-w-0",
              isActive
                ? "border-border bg-muted"
                : "border-transparent hover:bg-muted/60",
            )}
          >
            <span
              className={cn(
                "shrink-0",
                isActive ? "text-foreground" : "text-muted-foreground",
              )}
            >
              <Icon size={16} />
            </span>
            <span className="flex min-w-0 flex-col">
              <span
                className={cn(
                  "text-sm font-medium leading-tight",
                  isActive ? "text-foreground" : "text-foreground/90",
                )}
              >
                {s.label}
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground tabular">
                {s.live && (
                  <span className="relative mr-0.5 flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--success)] opacity-60" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
                  </span>
                )}
                {value == null ? "—" : formatCompact(value)} {s.suffix}
              </span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
