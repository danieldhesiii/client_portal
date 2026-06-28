"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Activity,
  BarChart3,
  ChevronDown,
  FileText,
  Footprints,
  Globe,
  LayoutDashboard,
  LifeBuoy,
  MonitorSmartphone,
  ShieldCheck,
  Share2,
  Users,
} from "lucide-react";
import type { DashboardSummary } from "@/lib/data/analytics";
import { SUPPORT_CATEGORIES } from "@/lib/support-config";
import { cn, formatCompact } from "@/lib/utils";

export type NavSite = { id: string; name: string };

type Icon = typeof Activity;

type AnalyticsItem = {
  href: string;
  label: string;
  icon: Icon;
  metric: keyof DashboardSummary;
  suffix: string;
  live?: boolean;
};

type SupportItem = {
  href: string;
  label: string;
  icon: Icon;
  hint: string;
};

const ANALYTICS: AnalyticsItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, metric: "visitors", suffix: "visitors" },
  { href: "/dashboard/pages", label: "Pages", icon: FileText, metric: "pageviews", suffix: "views" },
  { href: "/dashboard/behavior", label: "Behavior", icon: Footprints, metric: "sessions", suffix: "sessions" },
  { href: "/dashboard/sources", label: "Sources", icon: Share2, metric: "referrers", suffix: "referrers" },
  { href: "/dashboard/geography", label: "Geography", icon: Globe, metric: "countries", suffix: "countries" },
  { href: "/dashboard/audience", label: "Audience", icon: Users, metric: "languages", suffix: "languages" },
  { href: "/dashboard/devices", label: "Devices", icon: MonitorSmartphone, metric: "browsers", suffix: "browsers" },
  { href: "/dashboard/realtime", label: "Realtime", icon: Activity, metric: "active", suffix: "active now", live: true },
  { href: "/dashboard/uptime", label: "Uptime", icon: ShieldCheck, metric: "errors", suffix: "errors" },
];

// Support options are driven by the shared catalogue so adding one is a single
// config change (see src/lib/support-config.ts).
const SUPPORT: SupportItem[] = SUPPORT_CATEGORIES.map((c) => ({
  href: `/dashboard/support/${c.slug}`,
  label: c.label,
  icon: c.icon,
  hint: c.hint,
}));

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** A collapsible top-level nav section ("Analytics", "Support"). */
function NavGroup({
  label,
  icon: GroupIcon,
  defaultOpen,
  children,
}: {
  label: string;
  icon: Icon;
  defaultOpen: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  // Re-open when navigation lands inside this group (e.g. via a direct link).
  useEffect(() => {
    if (defaultOpen) setOpen(true);
  }, [defaultOpen]);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
      >
        <GroupIcon size={15} className="shrink-0" />
        <span className="flex-1 text-left">{label}</span>
        <ChevronDown
          size={14}
          className={cn("shrink-0 transition-transform", open && "rotate-180")}
        />
      </button>
      {open && <div className="mt-1 space-y-1 pl-1">{children}</div>}
    </div>
  );
}

function NavRow({
  href,
  active,
  icon: RowIcon,
  label,
  detail,
  live,
}: {
  href: string;
  active: boolean;
  icon: Icon;
  label: string;
  detail: React.ReactNode;
  live?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-md border px-3 py-2 transition-colors",
        active
          ? "border-border bg-muted"
          : "border-transparent hover:bg-muted/60",
      )}
    >
      <span
        className={cn(
          "shrink-0",
          active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        <RowIcon size={16} />
      </span>
      <span className="flex min-w-0 flex-col">
        <span
          className={cn(
            "text-sm font-medium leading-tight",
            active ? "text-foreground" : "text-foreground/90",
          )}
        >
          {label}
        </span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground tabular">
          {live && (
            <span className="relative mr-0.5 flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--success)] opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
            </span>
          )}
          {detail}
        </span>
      </span>
    </Link>
  );
}

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

  const analyticsActive = ANALYTICS.some((s) => isActive(pathname, s.href));
  const supportActive = SUPPORT.some((s) => isActive(pathname, s.href));

  return (
    <nav aria-label="Dashboard sections" className="flex flex-col gap-2">
      <NavGroup
        label="Analytics"
        icon={BarChart3}
        defaultOpen={analyticsActive || !supportActive}
      >
        {ANALYTICS.map((s) => {
          const value = summary ? summary[s.metric] : null;
          return (
            <NavRow
              key={s.href}
              href={hrefFor(s.href)}
              active={isActive(pathname, s.href)}
              icon={s.icon}
              label={s.label}
              live={s.live}
              detail={
                <>
                  {value == null ? "—" : formatCompact(value)} {s.suffix}
                </>
              }
            />
          );
        })}
      </NavGroup>

      <NavGroup label="Support" icon={LifeBuoy} defaultOpen={supportActive}>
        {SUPPORT.map((s) => (
          <NavRow
            key={s.href}
            href={hrefFor(s.href)}
            active={isActive(pathname, s.href)}
            icon={s.icon}
            label={s.label}
            detail={s.hint}
          />
        ))}
      </NavGroup>
    </nav>
  );
}
