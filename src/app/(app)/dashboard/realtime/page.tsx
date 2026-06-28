import { redirect } from "next/navigation";
import { resolveDashboardContext } from "@/lib/data/dashboard-context";
import { SectionHeader } from "@/components/dashboard/section-header";
import { Realtime } from "@/components/dashboard/realtime";

export const dynamic = "force-dynamic";

export default async function RealtimeSection({
  searchParams,
}: {
  searchParams: Promise<{ site?: string; range?: string }>;
}) {
  const ctx = await resolveDashboardContext(await searchParams);
  if (!ctx) redirect("/dashboard");
  const { site, rangeKey } = ctx;

  return (
    <div>
      <SectionHeader title="Realtime" site={site} rangeKey={rangeKey} />
      <p className="mb-4 text-sm text-muted-foreground">
        Visitors active on {site.domain} in the last 5 minutes, refreshing every
        10 seconds.
      </p>
      <div className="max-w-md">
        <Realtime siteId={site.id} />
      </div>
    </div>
  );
}
