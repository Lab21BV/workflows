// src/workflows/vi-reschedule/run.ts
import { z } from "zod";
import type { Workflow, WorkflowContext, WorkflowResult } from "../types";
import type { Department, Outcome, VoorinspectieRecord } from "./types";
import { evaluateReschedule } from "./evaluate";
import * as viRepo from "../../repo/voorinspecties";
import * as soRepo from "../../repo/sales-orders";
import * as prRepo from "../../repo/products";
import * as tlRepo from "../../repo/tijdlijn";
import * as taRepo from "../../repo/tasks";

/**
 * Collapse outcomes naar het ene Voorinspectie-patch object.
 * Andere outcomes (update_leverdatum, log_tijdlijn, create_todo) gaan via
 * aparte repo-calls — die hebben hun eigen module-record nodig.
 */
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

/**
 * Domeingerichte repo-interface bovenop de raw RecordsApi.
 *
 * Waarom een eigen `Repos` voor vi-reschedule en niet ctx.records?
 * Deze workflow leest uit 5 Zoho-modules (Voorinspecties, Sales_Orders,
 * Products, Datums_2 voor tijdlijn, Tasks voor todo) met domein-specifieke
 * transformaties (VoorinspectieRecord-shape, productIds extractie, etc.).
 * De interface vangt die abstractie zodat tests mock-implementaties kunnen
 * leveren zonder de hele RecordsApi te hoeven mocken.
 *
 * Andere workflows hebben dit niet nodig — die werken direct op één module
 * via `ctx.records.search/update`. Bewust geen valse uniformiteit.
 */
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

const productionRepos: Repos = {
  getVi: viRepo.get,
  getSalesOrderId: viRepo.getSalesOrderId,
  getSalesOrder: soRepo.get,
  getProducts: prRepo.getMany,
  updateVi: viRepo.update,
  updateLeverdatum: soRepo.updateLeverdatum,
  logEvent: tlRepo.logEvent,
  createTodo: taRepo.createTodo,
  // Stub for now — real portal-user notifications wired in a follow-up.
  notifyPortalUser: async () => {},
};

export async function runReschedule(
  payload: Payload,
  repos: Repos = productionRepos,
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
