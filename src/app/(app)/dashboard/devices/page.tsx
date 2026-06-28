import { redirect } from "next/navigation";
import { resolveDashboardContext } from "@/lib/data/dashboard-context";
import {
  getDeviceTypes,
  getBrowsers,
  getOperatingSystems,
} from "@/lib/data/analytics";
import { SectionHeader } from "@/components/dashboard/section-header";
import { DetailTable } from "@/components/dashboard/detail-table";

export const dynamic = "force-dynamic";

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default async function DevicesSection({
  searchParams,
}: {
  searchParams: Promise<{ site?: string; range?: string }>;
}) {
  const ctx = await resolveDashboardContext(await searchParams);
  if (!ctx) redirect("/dashboard");
  const { site, range, rangeKey } = ctx;

  const [devices, browsers, os] = await Promise.all([
    getDeviceTypes(site.id, range, 10),
    getBrowsers(site.id, range, 20),
    getOperatingSystems(site.id, range, 20),
  ]);

  return (
    <div>
      <SectionHeader title="Devices" site={site} rangeKey={rangeKey} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <DetailTable
          title="Device type"
          items={devices}
          labelHeader="Device"
          formatLabel={titleCase}
          emptyLabel="No device data yet"
        />
        <DetailTable
          title="Browsers"
          items={browsers}
          labelHeader="Browser"
          emptyLabel="No browser data yet"
        />
        <DetailTable
          title="Operating systems"
          items={os}
          labelHeader="OS"
          emptyLabel="No OS data yet"
        />
      </div>
    </div>
  );
}
