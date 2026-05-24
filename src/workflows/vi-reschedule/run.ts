// src/workflows/vi-reschedule/run.ts
import { z } from "zod";
import type { Workflow, WorkflowContext, WorkflowResult } from "../types";
import type { Department, Outcome, VoorinspectieRecord } from "./types";
import { evaluateReschedule } from "./evaluate";
// No repo imports at module level — all repo modules call new ZohoClient() at init.
// outcomesToPatch is inlined here to avoid that side-effect.
function outcomesToPatch(outcomes: Outcome[]): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const o of outcomes) {
    if (o.kind === "set_status") patch.VI_Voorstel_Status = o.status;
    if (o.kind === "commit_vi_datetime") patch.Datum_tijd = o.datetime;
  }
  return patch;
}

const payloadSchema = z.object({
  voorinspectieId: z.string().min(1),
});
type Payload = z.infer<typeof payloadSchema>;

// Repo interface used by runReschedule — allows test injection.
export interface Repos {
  getVi: (id: string, leverdatumOrigineel: string) => Promise<VoorinspectieRecord | null>;
  getSalesOrderId: (id: string) => Promise<string | null>;
  getSalesOrder: (id: string) => Promise<{ id: string; Leverdatum: string | null; productIds: string[] } | null>;
  getProducts: (ids: string[]) => Promise<{ id: string; Levertijd: number }[]>;
  updateVi: (id: string, patch: Record<string, unknown>) => Promise<void>;
  updateLeverdatum: (id: string, nieuweDatum: string) => Promise<void>;
  logEvent: (voorinspectieId: string, event: string) => Promise<string | null>;
  createTodo: (input: { department: Department; title: string; body: string; voorinspectieId: string }) => Promise<string | null>;
  notifyPortalUser: (who: string, template: string, vi: VoorinspectieRecord) => Promise<void>;
}

// Production repos are loaded lazily to avoid ZohoClient initialisation at import time.
function makeProductionRepos(): Repos {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const vi = require("../../repo/voorinspecties") as typeof import("../../repo/voorinspecties");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const so = require("../../repo/sales-orders") as typeof import("../../repo/sales-orders");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pr = require("../../repo/products") as typeof import("../../repo/products");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const tl = require("../../repo/tijdlijn") as typeof import("../../repo/tijdlijn");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ta = require("../../repo/tasks") as typeof import("../../repo/tasks");
  return {
    getVi: vi.get,
    getSalesOrderId: vi.getSalesOrderId,
    getSalesOrder: so.get,
    getProducts: pr.getMany,
    updateVi: vi.update,
    updateLeverdatum: so.updateLeverdatum,
    logEvent: tl.logEvent,
    createTodo: ta.createTodo,
    // Stub for now — real portal-user notifications wired in a follow-up.
    notifyPortalUser: async () => {},
  };
}

export async function runReschedule(
  payload: Payload,
  repos: Repos = makeProductionRepos(),
): Promise<{ outcomes: Outcome[] }> {
  const soId = await repos.getSalesOrderId(payload.voorinspectieId);
  if (!soId) return { outcomes: [] };
  const so = await repos.getSalesOrder(soId);
  if (!so || !so.Leverdatum) return { outcomes: [] };

  const products = await repos.getProducts(so.productIds);
  const langsteLevertijd = products.length === 0 ? 0 : Math.max(...products.map((p) => p.Levertijd));

  const vi = await repos.getVi(payload.voorinspectieId, so.Leverdatum);
  if (!vi) return { outcomes: [] };

  // Snapshot the buffer on first evaluation.
  if (vi.VI_Voorstel_Status === "awaiting_evaluation" && vi.VI_Buffer_Snapshot_Dagen == null) {
    vi.VI_Buffer_Snapshot_Dagen = 7 + langsteLevertijd;
    await repos.updateVi(payload.voorinspectieId, { VI_Buffer_Snapshot_Dagen: vi.VI_Buffer_Snapshot_Dagen });
  }

  const outcomes = evaluateReschedule(vi, langsteLevertijd);
  if (outcomes.length === 0) return { outcomes };

  // Aggregate Voorinspectie patches.
  const viPatch = outcomesToPatch(outcomes);
  if (Object.keys(viPatch).length > 0) {
    await repos.updateVi(payload.voorinspectieId, viPatch);
  }

  for (const o of outcomes) {
    if (o.kind === "update_leverdatum") {
      await repos.updateLeverdatum(soId, o.nieuweDatum);
    } else if (o.kind === "log_tijdlijn") {
      await repos.logEvent(payload.voorinspectieId, o.event);
    } else if (o.kind === "create_todo") {
      await repos.createTodo({
        department: o.department,
        title: o.title,
        body: o.body,
        voorinspectieId: payload.voorinspectieId,
      });
    } else if (o.kind === "notify_portal_user") {
      await repos.notifyPortalUser(o.who, o.template, vi);
    }
    // set_status and commit_vi_datetime were folded into viPatch already.
  }

  return { outcomes };
}

export const viReschedule: Workflow<Payload> = {
  id: "vi-reschedule",
  description: "Voorinspectie reschedule chain (buffer check, branches, leverdatum)",
  trigger: {
    name: "zoho.voorinspecties.field_update",
    description: "Zoho webhook on relevant Voorinspectie field updates",
    parse: (input) => payloadSchema.parse(input),
  },
  async run(payload, _ctx: WorkflowContext): Promise<WorkflowResult> {
    const result = await runReschedule(payload);
    return {
      status: "ok",
      message: `Applied ${result.outcomes.length} outcomes`,
      data: { outcomes: result.outcomes as unknown as Record<string, unknown> },
    };
  },
};
