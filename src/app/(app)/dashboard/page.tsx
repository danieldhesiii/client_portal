import Link from "next/link";
import { Globe } from "lucide-react";
import { getCurrentUser } from "@/lib/data/access";
import { resolveDashboardContext } from "@/lib/data/dashboard-context";
import {
  getOverviewStats,
  getTimeseries,
  getTopPages,
  getReferrers,
} from "@/lib/data/analytics";
import { SectionHeader } from "@/components/dashboard/section-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { TrafficChart } from "@/components/dashboard/traffic-chart";
import { BreakdownList } from "@/components/dashboard/breakdown-list";
import { Realtime } from "@/components/dashboard/realtime";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { sectionHref } from "@/lib/dashboard-links";
import { formatNumber, formatDuration, formatPercent } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string; range?: string }>;
}) {
  const params = await searchParams;
  const ctx = await resolveDashboardContext(params);

  if (!ctx) {
    const user = await getCurrentUser();
    return (
      <Card className="mt-6">
        <CardContent className="pt-6">
          <EmptyState
            icon={<Globe size={24} />}
            title="No sites yet"
            description={
              user?.role === "ADMIN"
                ? "Create a client and a site in the Admin area to start collecting analytics."
                : "Your account has no sites assigned yet. Please contact Vylora X."
            }
          />
          {user?.role === "ADMIN" && (
            <div className="flex justify-center pb-4">
              <Link
                href="/admin"
                className="text-sm font-medium text-[var(--accent)] hover:underline"
              >
                Go to Admin →
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  const { site, range, rangeKey } = ctx;
  const link = (path: string) => sectionHref(path, site.id, rangeKey);

  const [stats, timeseries, topPages, referrers] = await Promise.all([
    getOverviewStats(site.id, range),
    getTimeseries(site.id, range),
    getTopPages(site.id, range, 6),
    getReferrers(site.id, range, 6),
  ]);

  return (
    <div>
      <SectionHeader title="Overview" site={site} rangeKey={rangeKey} />

      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Unique visitors"
            value={stats.visitors.value}
            previous={stats.visitors.previous}
            format={formatNumber}
          />
          <StatCard
            label="Page views"
            value={stats.pageviews.value}
            previous={stats.pageviews.previous}
            format={formatNumber}
          />
          <StatCard
            label="Avg. session"
            value={stats.avgDurationMs.value}
            previous={stats.avgDurationMs.previous}
            format={formatDuration}
          />
          <StatCard
            label="Bounce rate"
            value={stats.bounceRate.value}
            previous={stats.bounceRate.previous}
            format={(n) => formatPercent(n)}
            lowerIsBetter
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Traffic over time</CardTitle>
            </CardHeader>
            <CardContent>
              <TrafficChart data={timeseries} granularity={range.granularity} />
            </CardContent>
          </Card>
          <Realtime siteId={site.id} />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <BreakdownList
            title="Top pages"
            items={topPages}
            viewAllHref={link("/dashboard/pages")}
          />
          <BreakdownList
            title="Referrers"
            items={referrers}
            emptyLabel="Mostly direct traffic"
            viewAllHref={link("/dashboard/sources")}
          />
        </div>
      </div>
    </div>
  );
}
