import { NextResponse } from "next/server";
import { runUptimeChecks } from "@/lib/data/uptime";

// Synthetic uptime job. Pings every site's URL and records availability.
// Scheduled via vercel.json crons; protected by the platform Authorization
// header (Vercel sets `Bearer $CRON_SECRET`) so the public can't trigger it.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sites = await runUptimeChecks();
  return NextResponse.json({ ok: true, sites });
}
