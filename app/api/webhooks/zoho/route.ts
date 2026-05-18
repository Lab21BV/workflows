import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { runWorkflow } from "@/src/index";

export const runtime = "nodejs";
export const maxDuration = 60;

function verifySignature(body: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  if (expected.length !== header.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(header));
}

export async function POST(req: NextRequest) {
  const raw = await req.text();

  const secret = process.env.ZOHO_WEBHOOK_SECRET;
  if (secret) {
    const sig = req.headers.get("x-zoho-signature");
    if (!verifySignature(raw, sig, secret)) {
      return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
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
