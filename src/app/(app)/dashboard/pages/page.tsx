import { redirect } from "next/navigation";
import { resolveDashboardContext } from "@/lib/data/dashboard-context";
import { getTopPages } from "@/lib/data/analytics";
import { SectionHeader } from "@/components/dashboard/section-header";
import { DetailTable } from "@/components/dashboard/detail-table";

export const dynamic = "force-dynamic";

export default async function PagesSection({
  searchParams,
}: {
  searchParams: Promise<{ site?: string; range?: string }>;
}) {
  const ctx = await resolveDashboardContext(await searchParams);
  if (!ctx) redirect("/dashboard");
  const { site, range, rangeKey } = ctx;

  const pages = await getTopPages(site.id, range, 30);

  return (
    <div>
      <SectionHeader title="Pages" site={site} rangeKey={rangeKey} />
      <DetailTable
        title="Top pages"
        items={pages}
        labelHeader="Path"
        valueHeader="Views"
        emptyLabel="No page views yet"
      />
    </div>
  );
}
