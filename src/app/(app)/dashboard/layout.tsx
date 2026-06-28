import { Suspense } from "react";
import { listAccessibleSites } from "@/lib/data/access";
import { SectionNav } from "@/components/dashboard/section-nav";

/**
 * Dashboard shell: a left section-nav (with live per-section summaries) beside
 * the active section's detail view. The nav is a client component reading the
 * `?site=` / `?range=` params, so it stays in sync as the user switches site or
 * range on any sub-page. Sites are fetched here (server) and passed down.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sites = await listAccessibleSites();

  // No sites: skip the nav entirely and let the page render its empty state.
  if (sites.length === 0) return <>{children}</>;

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
      <aside className="lg:w-56 lg:shrink-0">
        <div className="lg:sticky lg:top-20">
          <Suspense fallback={<div className="h-64" />}>
            <SectionNav sites={sites.map((s) => ({ id: s.id, name: s.name }))} />
          </Suspense>
        </div>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
