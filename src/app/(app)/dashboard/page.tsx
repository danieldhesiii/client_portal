import Link from "next/link";
import { Globe, Info } from "lucide-react";
import { listAccessibleSites, getCurrentUser } from "@/lib/data/access";
import {
  getOverviewStats,
  getTimeseries,
  getTopPages,
  getReferrers,
  getUtmSources,
  getCountries,
  getCities,
  getDeviceTypes,
  getBrowsers,
  getOperatingSystems,
} from "@/lib/data/analytics";
import { parseRangeKey, resolveRange } from "@/lib/date-range";
import { StatCard } from "@/components/dashboard/stat-card";
import { TrafficChart } from "@/components/dashboard/traffic-chart";
import { BreakdownList } from "@/components/dashboard/breakdown-list";
import { Realtime } from "@/components/dashboard/realtime";
import { RangePicker } from "@/components/dashboard/range-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import {
  formatNumber,
  formatDuration,
  formatPercent,
} from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string; range?: string }>;
}) {
  const { site: siteParam, range: rangeParam } = await searchParams;
  const [user, sites] = await Promise.all([
    getCurrentUser(),
    listAccessibleSites(),
  ]);

  if (sites.length === 0) {
    return (
      <Card className="mt-10">
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

  // Resolve selected site (validate it is in the accessible set).
  const selected =
    sites.find((s) => s.id === siteParam)?.id ?? sites[0].id;
  const site = sites.find((s) => s.id === selected)!;

  const rangeKey = parseRangeKey(rangeParam);
  const range = resolveRange(rangeKey);

  const [
    stats,
    timeseries,
    topPages,
    referrers,
    utm,
    countries,
    cities,
    devices,
    browsers,
    os,
  ] = await Promise.all([
    getOverviewStats(selected, range),
    getTimeseries(selected, range),
    getTopPages(selected, range),
    getReferrers(selected, range),
    getUtmSources(selected, range),
    getCountries(selected, range),
    getCities(selected, range),
    getDeviceTypes(selected, range),
    getBrowsers(selected, range),
    getOperatingSystems(selected, range),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{site.name}</h1>
          <p className="text-sm text-muted-foreground">{site.domain}</p>
        </div>
        <RangePicker current={rangeKey} />
      </div>

      {/* Headline stats + realtime */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
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

      {/* Traffic chart + realtime */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Traffic over time</CardTitle>
          </CardHeader>
          <CardContent>
            <TrafficChart data={timeseries} granularity={range.granularity} />
          </CardContent>
        </Card>
        <Realtime siteId={selected} />
      </div>

      {/* Pages + sources */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BreakdownList title="Top pages" items={topPages} valueHeader="Views" />
        <BreakdownList
          title="Referrers"
          items={referrers}
          emptyLabel="Mostly direct traffic"
          formatLabel={(l) => l}
        />
      </div>

      {/* UTM + geography */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <BreakdownList
          title="UTM sources"
          items={utm}
          emptyLabel="No campaign traffic"
        />
        <BreakdownList title="Countries" items={countries} />
        <BreakdownList title="Cities" items={cities} />
      </div>

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Info size={12} />
        Geography is approximate, location-only data derived from IP addresses
        which are never stored.
      </p>

      {/* Devices */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <BreakdownList
          title="Devices"
          items={devices}
          formatLabel={(l) => l.charAt(0).toUpperCase() + l.slice(1)}
        />
        <BreakdownList title="Browsers" items={browsers} />
        <BreakdownList title="Operating systems" items={os} />
      </div>
    </div>
  );
}
