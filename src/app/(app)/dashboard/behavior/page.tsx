import { redirect } from "next/navigation";
import { resolveDashboardContext } from "@/lib/data/dashboard-context";
import {
  getEngagement,
  getEntryPages,
  getExitPages,
} from "@/lib/data/analytics";
import { SectionHeader } from "@/components/dashboard/section-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { DetailTable } from "@/components/dashboard/detail-table";
import {
  formatNumber,
  formatDuration,
  formatPercent,
} from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function BehaviorSection({
  searchParams,
}: {
  searchParams: Promise<{ site?: string; range?: string }>;
}) {
  const ctx = await resolveDashboardContext(await searchParams);
  if (!ctx) redirect("/dashboard");
  const { site, range, rangeKey } = ctx;

  // Previous-period engagement reuses the same query over the comparison window
  // so every metric carries a trend.
  const prevRange = { ...range, from: range.prevFrom, to: range.prevTo };

  const [engagement, prev, entryPages, exitPages] = await Promise.all([
    getEngagement(site.id, range),
    getEngagement(site.id, prevRange),
    getEntryPages(site.id, range, 30),
    getExitPages(site.id, range, 30),
  ]);

  return (
    <div>
      <SectionHeader title="Behavior" site={site} rangeKey={rangeKey} />
      <p className="mb-4 text-sm text-muted-foreground">
        How visitors move through {site.domain} — where they land, where they
        leave, and how deeply they engage.
      </p>

      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Sessions"
            value={engagement.sessions}
            previous={prev.sessions}
            format={formatNumber}
          />
          <StatCard
            label="Pages / session"
            value={engagement.pagesPerSession}
            previous={prev.pagesPerSession}
            format={(n) => n.toFixed(1)}
          />
          <StatCard
            label="Avg. session"
            value={engagement.avgSessionMs}
            previous={prev.avgSessionMs}
            format={formatDuration}
          />
          <StatCard
            label="Bounce rate"
            value={engagement.bounceRate}
            previous={prev.bounceRate}
            format={(n) => formatPercent(n)}
            lowerIsBetter
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <DetailTable
            title="Entry pages"
            items={entryPages}
            labelHeader="Landing page"
            valueHeader="Sessions"
            emptyLabel="No sessions yet"
          />
          <DetailTable
            title="Exit pages"
            items={exitPages}
            labelHeader="Last page"
            valueHeader="Sessions"
            emptyLabel="No sessions yet"
          />
        </div>
      </div>
    </div>
  );
}
