import { WORKFLOWS } from "../src/workflows/registry.js";
import { MODULES } from "../src/zoho/modules.js";

export const config = { runtime: "nodejs" };

interface VercelRequest {
  method?: string;
}
interface VercelResponse {
  status(code: number): VercelResponse;
  setHeader(name: string, value: string): VercelResponse;
  json(body: object): void;
}

export default function handler(_req: VercelRequest, res: VercelResponse) {
  const workflows = Object.values(WORKFLOWS).map((w) => ({
    id: w.id,
    description: w.description,
    trigger: w.trigger.name,
  }));

  const modulesByKind: Record<string, string[]> = {};
  for (const [api, meta] of Object.entries(MODULES)) {
    const k = meta.kind;
    if (!modulesByKind[k]) modulesByKind[k] = [];
    modulesByKind[k].push(api);
  }

  res.setHeader("cache-control", "public, max-age=60");
  res.status(200).json({
    service: "lab21-workflows",
    workflows,
    modules: {
      total: Object.keys(MODULES).length,
      byKind: modulesByKind,
    },
    crons: [
      { path: "/api/cron/showroom-review-followup", schedule: "0 8 * * *" },
      { path: "/api/cron/voorinspectie-no-response", schedule: "30 8 * * *" },
    ],
  });
}
