"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LogOut } from "lucide-react";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { signOutAction } from "@/app/(app)/actions";
import { cn } from "@/lib/utils";

export type NavSite = { id: string; name: string; domain: string };

export function TopNav({
  sites,
  isAdmin,
  user,
}: {
  sites: NavSite[];
  isAdmin: boolean;
  user: { name: string | null; email: string };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSite = searchParams.get("site") ?? sites[0]?.id ?? "";

  function onSiteChange(siteId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("site", siteId);
    // Stay on the current dashboard section when switching site; from non-
    // dashboard pages (e.g. Admin) jump to the dashboard overview.
    const base = pathname.startsWith("/dashboard") ? pathname : "/dashboard";
    router.push(`${base}?${params.toString()}`);
  }

  const links = [
    { href: "/dashboard", label: "Dashboard" },
    ...(isAdmin ? [{ href: "/admin", label: "Admin" }] : []),
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link href="/dashboard" className="shrink-0">
          <Brand />
        </Link>

        {sites.length > 0 && (
          <div className="hidden sm:block">
            <Select
              value={currentSite}
              onChange={(e) => onSiteChange(e.target.value)}
              className="h-8 max-w-[200px] text-xs"
            >
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {s.domain}
                </option>
              ))}
            </Select>
          </div>
        )}

        <nav className="ml-auto flex items-center gap-1">
          {links.map((l) => {
            const active =
              l.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {l.label}
              </Link>
            );
          })}

          <ThemeToggle />

          <form action={signOutAction}>
            <Button
              variant="ghost"
              size="icon"
              type="submit"
              aria-label="Sign out"
              title={`Sign out (${user.email})`}
            >
              <LogOut size={16} />
            </Button>
          </form>
        </nav>
      </div>
    </header>
  );
}
