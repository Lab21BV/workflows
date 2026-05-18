import { runWorkflow } from "../../src/index.js";

export const config = { runtime: "nodejs", maxDuration: 60 };

interface VercelRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
}
interface VercelResponse {
  status(code: number): VercelResponse;
  json(body: object): void;
}

function isAuthorized(req: VercelRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const header = req.headers["authorization"];
  const value = Array.isArray(header) ? header[0] : header;
  return value === `Bearer ${secret}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!isAuthorized(req)) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  try {
    const result = await runWorkflow("voorinspectie-no-response", { daysWaiting: 3 });
    res.status(200).json(result as object);
  } catch (err) {
    console.error("voorinspectie-no-response cron error", err);
    res.status(500).json({ error: (err as Error).message });
  }
}
