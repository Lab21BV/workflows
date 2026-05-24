import { NextRequest, NextResponse } from "next/server";
import { ZohoClient, RecordsApi } from "@/src/zoho";
import { runReschedule } from "@/src/workflows/vi-reschedule/run";

export const runtime = "nodejs";
export const maxDuration = 60;

// Terminal statuses we want to exclude (rest = "in flight" → reconcile).
const TERMINAL = ["done", "rejected", "none"];

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const records = new RecordsApi(new ZohoClient());
  const stale = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  // Zoho search criteria doesn't support :in:; chain :not_equal:.
  const notTerminal = TERMINAL.map((s) => `(VI_Voorstel_Status:not_equal:${s})`).join("and");
  const criteria = `${notTerminal}and(Modified_Time:before:${stale})`;
  const res = await records.search<{ id: string }>("Voorinspecties", { criteria, perPage: 50 });

  const results: { id: string; outcomes: number }[] = [];
  for (const r of res.data) {
    try {
      const out = await runReschedule({ voorinspectieId: r.id });
      results.push({ id: r.id, outcomes: out.outcomes.length });
    } catch (err) {
      console.error("vi-reschedule-stuck reconciliation failed", r.id, err);
    }
  }

  return NextResponse.json({ checked: res.data.length, processed: results });
}
