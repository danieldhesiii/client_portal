import { redirect } from "next/navigation";
import { resolveDashboardContext } from "@/lib/data/dashboard-context";
import {
  getLanguages,
  getScreenSizes,
  getActivityByHour,
} from "@/lib/data/analytics";
import { SectionHeader } from "@/components/dashboard/section-header";
import { DetailTable } from "@/components/dashboard/detail-table";
import { ActivityByHour } from "@/components/dashboard/activity-by-hour";

export const dynamic = "force-dynamic";

export default async function AudienceSection({
  searchParams,
}: {
  searchParams: Promise<{ site?: string; range?: string }>;
}) {
  const ctx = await resolveDashboardContext(await searchParams);
  if (!ctx) redirect("/dashboard");
  const { site, range, rangeKey } = ctx;

  const [languages, screens, activity] = await Promise.all([
    getLanguages(site.id, range, 20),
    getScreenSizes(site.id, range),
    getActivityByHour(site.id, range),
  ]);

  return (
    <div>
      <SectionHeader title="Audience" site={site} rangeKey={rangeKey} />
      <p className="mb-4 text-sm text-muted-foreground">
        Who is visiting {site.domain} — their language, the screens they browse
        on, and when they are most active.
      </p>

      <div className="space-y-4">
        <ActivityByHour data={activity} />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <DetailTable
            title="Languages"
            items={languages}
            labelHeader="Language"
            emptyLabel="No language data yet"
          />
          <DetailTable
            title="Screen sizes"
            items={screens}
            labelHeader="Breakpoint"
            emptyLabel="No screen data yet"
          />
        </div>
      </div>
    </div>
  );
}
