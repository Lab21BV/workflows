import { z } from "zod";
import type { Workflow, WorkflowContext, WorkflowResult } from "./types.js";

/**
 * Reference workflow — placeholder for the real Zoho rule.
 *
 * Trigger: a "Voorinspecties" record is edited and its status flips to "Afgerond".
 * Action:  ensure a "Planningen" (Uitvoeringen) record exists that references it,
 *          carrying over the locatie + planned date.
 *
 * Field API names below are guesses based on the Dutch module labels — adjust
 * after running the `zoho:probe` script against the real layout.
 */

const payloadSchema = z.object({
  voorinspectieId: z.string().min(1),
  status: z.string().optional(),
  locatieId: z.string().optional(),
  plannedDate: z.string().optional(),
});

type Payload = z.infer<typeof payloadSchema>;

export const voorinspectieAfgerond: Workflow<Payload> = {
  id: "voorinspectie-afgerond",
  description:
    "When a Voorinspectie is marked Afgerond, create or update a linked Planning (Uitvoering).",

  trigger: {
    name: "zoho.voorinspectie.edit",
    description: "Zoho webhook on Voorinspecties edit",
    parse: (input) => payloadSchema.parse(input),
  },

  async run(payload: Payload, ctx: WorkflowContext): Promise<WorkflowResult> {
    if (payload.status && payload.status.toLowerCase() !== "afgerond") {
      return { status: "skipped", message: `status=${payload.status}` };
    }

    const voorinspectie = await ctx.records.get("Voorinspecties", payload.voorinspectieId);
    if (!voorinspectie) {
      return { status: "error", message: "Voorinspectie not found" };
    }

    const existing = await ctx.records.search("Planningen", {
      criteria: `(Voorinspectie:equals:${payload.voorinspectieId})`,
      perPage: 1,
    });
    if (existing.data.length > 0) {
      ctx.logger.info("Planning already exists", { id: existing.data[0]?.id });
      return { status: "skipped", message: "Planning already linked" };
    }

    const created = await ctx.records.create("Planningen", [
      {
        Name: `Uitvoering ${payload.voorinspectieId}`,
        Voorinspectie: payload.voorinspectieId,
        Locatie: payload.locatieId,
        Geplande_datum: payload.plannedDate,
        Bron: "Workflow:voorinspectie-afgerond",
      },
    ]);

    return {
      status: "ok",
      message: "Planning created",
      data: { planningId: created.data[0]?.details.id },
    };
  },
};
