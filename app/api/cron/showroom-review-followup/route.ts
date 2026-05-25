import { NextRequest, NextResponse } from "next/server";
import { runWorkflow } from "@/src/index";
import { isCronAuthorized } from "@/src/lib/cron-auth";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await runWorkflow("showroom-review-followup", {});
    return NextResponse.json(result as object);
  } catch (err) {
    console.error("showroom-review-followup cron error", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
