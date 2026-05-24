import { NextRequest, NextResponse } from "next/server";
import { runWorkflow } from "@/src/index";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const raw = await req.text();

  // Zoho's standard webhook UI cannot sign payloads (no HMAC support), so we
  // authenticate via a shared bearer token in the Authorization header that
  // Zoho can attach as a custom header on the webhook action.
  const secret = process.env.ZOHO_WEBHOOK_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const workflowId = req.headers.get("x-workflow");
  if (!workflowId) {
    return NextResponse.json({ error: "missing_x_workflow_header" }, { status: 400 });
  }

  let payload: unknown;
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  try {
    const result = await runWorkflow(workflowId, payload);
    return NextResponse.json({ workflow: workflowId, ...(result as object) });
  } catch (err) {
    console.error("workflow error", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
