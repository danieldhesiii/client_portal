import { redirect } from "next/navigation";
import { resolveDashboardContext } from "@/lib/data/dashboard-context";
import {
  getReferrers,
  getUtmSources,
  getUtmMediums,
  getUtmCampaigns,
} from "@/lib/data/analytics";
import { SectionHeader } from "@/components/dashboard/section-header";
import { DetailTable } from "@/components/dashboard/detail-table";

export const dynamic = "force-dynamic";

export default async function SourcesSection({
  searchParams,
}: {
  searchParams: Promise<{ site?: string; range?: string }>;
}) {
  const ctx = await resolveDashboardContext(await searchParams);
  if (!ctx) redirect("/dashboard");
  const { site, range, rangeKey } = ctx;

  const [referrers, utmSources, utmMediums, utmCampaigns] = await Promise.all([
    getReferrers(site.id, range, 30),
    getUtmSources(site.id, range, 15),
    getUtmMediums(site.id, range, 15),
    getUtmCampaigns(site.id, range, 15),
  ]);

  return (
    <div>
      <SectionHeader title="Traffic sources" site={site} rangeKey={rangeKey} />
      <div className="space-y-4">
        <DetailTable
          title="Referrers"
          items={referrers}
          labelHeader="Source"
          valueHeader="Views"
          emptyLabel="Mostly direct traffic — no referrers recorded"
        />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <DetailTable
            title="UTM source"
            items={utmSources}
            labelHeader="utm_source"
            emptyLabel="No campaign traffic"
          />
          <DetailTable
            title="UTM medium"
            items={utmMediums}
            labelHeader="utm_medium"
            emptyLabel="No campaign traffic"
          />
          <DetailTable
            title="UTM campaign"
            items={utmCampaigns}
            labelHeader="utm_campaign"
            emptyLabel="No campaign traffic"
          />
        </div>
      </div>
    </div>
  );
}
