import { NextRequest, NextResponse } from "next/server";
import { runWorkflow } from "@/src/index";

export const runtime = "nodejs";
export const maxDuration = 60;

// Zoho's standard webhook UI configures "module_parameters" (record-data
// references like ${Voorinspecties.id}) and sends them as HTTP headers with
// body.type=none. HTTP normalizes header names to lowercase on the wire, so
// we map known headers back to the camelCase keys that workflow schemas
// expect. Extend this map per workflow.
const HEADER_TO_PAYLOAD: Record<string, string> = {
  voorinspectieid: "voorinspectieId",
  salesorderid: "salesOrderId",
};

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

  // Zoho's standard workflow webhooks send "module_parameters" as URL query
  // strings (with body.type=none). Merge query → body so workflow payload
  // schemas don't have to know which transport was used.
  let body: Record<string, unknown> = {};
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") body = parsed as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }
  }
  const query: Record<string, string> = {};
  req.nextUrl.searchParams.forEach((value, key) => {
    query[key] = value;
  });
  const headerFields: Record<string, string> = {};
  for (const [headerName, payloadKey] of Object.entries(HEADER_TO_PAYLOAD)) {
    const v = req.headers.get(headerName);
    if (v) headerFields[payloadKey] = v;
  }
  const payload = { ...headerFields, ...query, ...body };

  try {
    const result = await runWorkflow(workflowId, payload);
    return NextResponse.json({ workflow: workflowId, ...(result as object) });
  } catch (err) {
    console.error("workflow error", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
