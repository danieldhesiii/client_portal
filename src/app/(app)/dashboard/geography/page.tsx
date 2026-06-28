import { redirect } from "next/navigation";
import { Info } from "lucide-react";
import { resolveDashboardContext } from "@/lib/data/dashboard-context";
import { getCountries, getCities } from "@/lib/data/analytics";
import { SectionHeader } from "@/components/dashboard/section-header";
import { DetailTable } from "@/components/dashboard/detail-table";

export const dynamic = "force-dynamic";

export default async function GeographySection({
  searchParams,
}: {
  searchParams: Promise<{ site?: string; range?: string }>;
}) {
  const ctx = await resolveDashboardContext(await searchParams);
  if (!ctx) redirect("/dashboard");
  const { site, range, rangeKey } = ctx;

  const [countries, cities] = await Promise.all([
    getCountries(site.id, range, 50),
    getCities(site.id, range, 50),
  ]);

  return (
    <div>
      <SectionHeader title="Geography" site={site} rangeKey={rangeKey} />
      <p className="mb-4 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Info size={12} />
        Approximate, location-only data derived from IP addresses, which are
        never stored.
      </p>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DetailTable
          title="Countries"
          items={countries}
          labelHeader="Country"
          emptyLabel="No geography data yet"
        />
        <DetailTable
          title="Cities"
          items={cities}
          labelHeader="City"
          emptyLabel="No geography data yet"
        />
      </div>
    </div>
  );
}
