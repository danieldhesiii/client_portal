import { redirect } from "next/navigation";
import { format } from "date-fns";
import { getCurrentUser } from "@/lib/data/access";
import { resolveDashboardContext } from "@/lib/data/dashboard-context";
import {
  getUptimeSummary,
  getUptimeDaily,
  getUptimeIncidents,
  getComponentHealth,
  getClientErrors,
} from "@/lib/data/uptime";
import { SectionHeader } from "@/components/dashboard/section-header";
import { DetailTable } from "@/components/dashboard/detail-table";
import { AvailabilityTimeline } from "@/components/dashboard/availability-timeline";
import { AutoRefresh } from "@/components/auto-refresh";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { formatNumber, formatPercent } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS_META = {
  operational: { label: "All systems operational", color: "var(--success)" },
  down: { label: "Site is unreachable", color: "var(--danger)" },
  unknown: { label: "Awaiting first check", color: "var(--muted-foreground)" },
} as const;

function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card className="p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular tracking-tight">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}

export default async function UptimeSection({
  searchParams,
}: {
  searchParams: Promise<{ site?: string; range?: string }>;
}) {
  // Uptime monitoring is an agency-only view; clients must never see it, even
  // by navigating to the URL directly. Gate before any data is loaded.
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");

  const ctx = await resolveDashboardContext(await searchParams);
  if (!ctx) redirect("/dashboard");
  const { site, range, rangeKey } = ctx;

  const [summary, daily, incidents, components, clientErrors] =
    await Promise.all([
      getUptimeSummary(site.id, range),
      getUptimeDaily(site.id, range),
      getUptimeIncidents(site.id, range, 10),
      getComponentHealth(site.id, range, 12),
      getClientErrors(site.id, range, 8),
    ]);

  const status = STATUS_META[summary.status];
  const noData =
    summary.totalChecks === 0 &&
    components.length === 0 &&
    clientErrors.length === 0;

  return (
    <div>
      <SectionHeader title="Uptime" site={site} rangeKey={rangeKey} />
      <p className="mb-4 text-sm text-muted-foreground">
        Availability of {site.domain} and the third-party components it relies
        on, from synthetic checks and real-visitor monitoring.
      </p>
      <AutoRefresh interval={30000} />

      {noData ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              title="Monitoring is being set up"
              description="Synthetic checks run every 5 minutes and real-user signals arrive as visitors load the site. Data will appear here shortly."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Status banner */}
          <Card className="p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span
                  className="relative flex h-3 w-3"
                  aria-hidden
                >
                  {summary.status === "operational" && (
                    <span
                      className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
                      style={{ backgroundColor: status.color }}
                    />
                  )}
                  <span
                    className="relative inline-flex h-3 w-3 rounded-full"
                    style={{ backgroundColor: status.color }}
                  />
                </span>
                <div>
                  <p className="font-medium">{status.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {summary.lastCheckedAt
                      ? `Last checked ${format(summary.lastCheckedAt, "d MMM yyyy, HH:mm")}`
                      : "Not yet checked"}
                    {summary.lastError ? ` · ${summary.lastError}` : ""}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* KPI tiles */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label="Availability"
              value={
                summary.uptimePct == null
                  ? "—"
                  : formatPercent(summary.uptimePct, 2)
              }
              hint={`${formatNumber(summary.totalChecks)} checks`}
            />
            <StatTile
              label="Avg. response"
              value={
                summary.avgResponseMs == null
                  ? "—"
                  : `${formatNumber(summary.avgResponseMs)} ms`
              }
              hint="successful checks"
            />
            <StatTile
              label="Incidents"
              value={formatNumber(summary.failedChecks)}
              hint="failed checks in range"
            />
            <StatTile
              label="Component errors"
              value={formatNumber(
                components.reduce((s, c) => s + c.failures, 0),
              )}
              hint={`${components.length} components affected`}
            />
          </div>

          <AvailabilityTimeline days={daily} />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <DetailTable
              title="Connected components"
              items={components.map((c) => ({
                label: c.host,
                value: c.failures,
              }))}
              labelHeader="Component"
              valueHeader="Errors"
              emptyLabel="No component failures detected"
            />

            <Card>
              <CardHeader>
                <CardTitle>Recent incidents</CardTitle>
              </CardHeader>
              <CardContent>
                {incidents.length === 0 ? (
                  <EmptyState title="No downtime in this period" />
                ) : (
                  <ul className="divide-y divide-border">
                    {incidents.map((i, idx) => (
                      <li
                        key={idx}
                        className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0 text-sm"
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: "var(--danger)" }}
                            aria-hidden
                          />
                          <span className="text-muted-foreground">
                            {i.error ??
                              (i.statusCode ? `HTTP ${i.statusCode}` : "Failed")}
                          </span>
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground tabular">
                          {format(i.checkedAt, "d MMM, HH:mm")}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          {clientErrors.length > 0 && (
            <DetailTable
              title="Client-side errors"
              items={clientErrors.map((e) => ({
                label: e.message,
                value: e.count,
              }))}
              labelHeader="Error"
              valueHeader="Count"
              emptyLabel="No client-side errors reported"
            />
          )}
        </div>
      )}
    </div>
  );
}
