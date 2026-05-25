import { NextRequest, NextResponse } from "next/server";
import { runWorkflow } from "@/src/index";

export const runtime = "nodejs";
export const maxDuration = 60;

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
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
