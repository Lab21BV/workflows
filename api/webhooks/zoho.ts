import { createHmac, timingSafeEqual } from "node:crypto";
import { runWorkflow } from "../../src/index.js";

export const config = { runtime: "nodejs" };

/**
 * Zoho CRM workflow-rule → Webhook. Configureer in Zoho Setup → Automation →
 * Webhooks met:
 *   - URL: https://<your-domain>/api/webhooks/zoho
 *   - Method: POST, JSON body
 *   - Body: { module, id, status, previousStatus, ...record fields }
 *   - Header: X-Workflow: <workflow-id>
 *   - (Optioneel) Header: X-Zoho-Signature: <hmac-sha256 of body, hex>
 *     met de shared secret in env var ZOHO_WEBHOOK_SECRET.
 */

interface VercelRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
  on(event: "data" | "end" | "error", listener: (chunk?: Buffer) => void): void;
}

interface VercelResponse {
  status(code: number): VercelResponse;
  setHeader(name: string, value: string): VercelResponse;
  send(body: string | object): void;
  json(body: object): void;
}

async function readBody(req: VercelRequest): Promise<string> {
  if (typeof req.body === "string") return req.body;
  if (req.body && typeof req.body === "object") return JSON.stringify(req.body);
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => c && chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function verifySignature(body: string, header: string | undefined, secret: string): boolean {
  if (!header) return false;
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  if (expected.length !== header.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(header));
}

function headerString(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const raw = await readBody(req);

  const secret = process.env.ZOHO_WEBHOOK_SECRET;
  if (secret) {
    const sig = headerString(req.headers["x-zoho-signature"]);
    if (!verifySignature(raw, sig, secret)) {
      res.status(401).json({ error: "invalid_signature" });
      return;
    }
  }

  const workflowId = headerString(req.headers["x-workflow"]);
  if (!workflowId) {
    res.status(400).json({ error: "missing_x_workflow_header" });
    return;
  }

  let payload: unknown;
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    res.status(400).json({ error: "invalid_json" });
    return;
  }

  try {
    const result = await runWorkflow(workflowId, payload);
    res.status(200).json({ workflow: workflowId, ...(result as object) });
  } catch (err) {
    console.error("workflow error", err);
    res.status(500).json({ error: (err as Error).message });
  }
}
