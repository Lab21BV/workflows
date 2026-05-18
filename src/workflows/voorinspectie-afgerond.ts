import { z } from "zod";
import {
  canTransition,
  type VoorinspectieState,
  VOORINSPECTIE_STATES,
} from "../zoho/blueprints/voorinspectie.js";
import type { Workflow, WorkflowContext, WorkflowResult } from "./types.js";

/**
 * Workflow: when a Voorinspectie transitions to "Akkoord" (i.e. customer
 * + legger both signed off), spin up the matching Planning record so the
 * uitvoering chain (Verwijderen → Voorbereiden → ... → Afwerken) can start.
 *
 * Trigger source: Zoho webhook on `Voorinspecties` edit, configured to
 * post the record ID + Status (Fase) + Aannemer + Gewenste_leverdatum.
 *
 * Field references are validated against `data/zoho/Voorinspecties.json`
 * (regenerate with `npx tsx src/scripts/sync-metadata.ts Voorinspecties`).
 */

const stateSchema = z.enum(VOORINSPECTIE_STATES);

const payloadSchema = z.object({
  voorinspectieId: z.string().min(1),
  status: stateSchema,
  previousStatus: stateSchema.optional(),
});

type Payload = z.infer<typeof payloadSchema>;

const TRIGGER_STATE: VoorinspectieState = "Akkoord klant VI";

type VoorinspectieRecord = {
  [k: string]: unknown;
  id: string;
  Name: string;
  Status: VoorinspectieState;
  Aannemer?: { id: string; name: string };
  Verkooporders?: { id: string; name: string };
  Contactpersoon?: { id: string; name: string };
  Gewenste_leverdatum?: string;
  Accountmanager?: { id: string; name: string };
};

export const voorinspectieAfgerond: Workflow<Payload> = {
  id: "voorinspectie-akkoord",
  description: "When Voorinspectie status → Akkoord, create the Planning record for execution.",

  trigger: {
    name: "zoho.voorinspecties.edit",
    description: "Zoho webhook on Voorinspecties edit",
    parse: (input) => payloadSchema.parse(input),
  },

  async run(payload: Payload, ctx: WorkflowContext): Promise<WorkflowResult> {
    if (payload.status !== TRIGGER_STATE) {
      return { status: "skipped", message: `status=${payload.status}` };
    }
    if (payload.previousStatus && !canTransition(payload.previousStatus, payload.status)) {
      ctx.logger.warn("Unexpected transition", payload);
    }

    const vi = await ctx.records.get<VoorinspectieRecord>(
      "Voorinspecties",
      payload.voorinspectieId,
    );
    if (!vi) return { status: "error", message: "Voorinspectie not found" };

    const existing = await ctx.records.search("Planningen", {
      criteria: `(Verkooporder:equals:${vi.Verkooporders?.id ?? ""})and(Dienst:equals:Vloer leggen)`,
      perPage: 1,
    });
    if (existing.data.length > 0) {
      return { status: "skipped", message: "Planning already exists" };
    }

    const created = await ctx.records.create("Planningen", [
      {
        Name: `Uitvoering ${vi.Name}`,
        Verkooporder: vi.Verkooporders?.id,
        Aannemer: vi.Aannemer?.id,
        Contactpersoon: vi.Contactpersoon?.id,
        Dienst: "Vloer leggen",
        Uitvoerder: "Aannemer van Lab21",
        Fase: "Nog niet gedaan",
        Gewenste_leverdatum: vi.Gewenste_leverdatum,
      },
    ]);

    return {
      status: "ok",
      message: "Planning created",
      data: { planningId: created.data[0]?.details.id },
    };
  },
};
