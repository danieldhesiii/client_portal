import { NextResponse } from "next/server";
import { getRealtime } from "@/lib/data/analytics";
import { AccessError } from "@/lib/data/access";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ siteId: string }> },
) {
  const { siteId } = await params;
  try {
    const data = await getRealtime(siteId);
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[realtime] error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
