import { NextResponse } from "next/server";
import { subDays } from "date-fns";
import { rollupAllSites } from "@/lib/data/rollup";

// Daily aggregation job. Scheduled via vercel.json crons. Protected by the
// platform Authorization header (Vercel sets `Bearer $CRON_SECRET`) so it
// can't be triggered by the public.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  // Roll up today (partial) and yesterday (in case of late beacons).
  const todayCount = await rollupAllSites(now);
  await rollupAllSites(subDays(now, 1));

  return NextResponse.json({ ok: true, sites: todayCount });
}
