import { NextResponse } from "next/server";
import { WORKFLOWS } from "@/src/workflows/registry";
import { MODULES } from "@/src/zoho/modules";

export const runtime = "nodejs";

export async function GET() {
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

  return NextResponse.json(
    {
      service: "lab21-workflows",
      workflows,
      modules: { total: Object.keys(MODULES).length, byKind: modulesByKind },
      crons: [
        { path: "/api/cron/showroom-review-followup", schedule: "0 8 * * *" },
        { path: "/api/cron/voorinspectie-no-response", schedule: "30 8 * * *" },
      ],
    },
    { headers: { "cache-control": "public, max-age=60" } },
  );
}
