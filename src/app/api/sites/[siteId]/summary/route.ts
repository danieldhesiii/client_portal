import { NextResponse } from "next/server";
import { getDashboardSummary } from "@/lib/data/analytics";
import { AccessError } from "@/lib/data/access";
import { parseRangeKey, resolveRange } from "@/lib/date-range";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ siteId: string }> },
) {
  const { siteId } = await params;
  const rangeKey = parseRangeKey(new URL(req.url).searchParams.get("range"));
  try {
    const data = await getDashboardSummary(siteId, resolveRange(rangeKey));
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[summary] error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
