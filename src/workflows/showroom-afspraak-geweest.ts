import { z } from "zod";
import type { Workflow, WorkflowContext, WorkflowResult } from "./types.js";
import { SHOWROOM_FASES, type ShowroomFase } from "../zoho/blueprints/showroom.js";

/**
 * Workflow: wanneer een Showroom-afspraak op Fase=Geweest komt, leg dat vast
 * in de Tijdlijn (Datums_2) en plan over 3 dagen een review-aanvraag in.
 *
 * Trigger: Zoho webhook op `Showroom` edit → POST naar /api/webhooks/zoho
 * met { module:"Showroom", id, status:"Geweest" }.
 *
 * Het tijdgebonden gedeelte (review na 3 dagen) wordt door de cron job
 * `/api/cron/showroom-review-followup` opgepakt — die scant Showroom records
 * met Fase=Geweest + Modified_Time ≥ 3 dagen geleden + zonder bestaande
 * Review.
 */

const fasesSchema = z.enum(SHOWROOM_FASES);

const payloadSchema = z.object({
  showroomId: z.string().min(1),
  status: fasesSchema,
  previousStatus: fasesSchema.optional(),
});

type Payload = z.infer<typeof payloadSchema>;

const TRIGGER_STATE: ShowroomFase = "Geweest";

type ShowroomRecord = {
  [k: string]: unknown;
  id: string;
  Name?: string;
  Fase: ShowroomFase;
  Stage?: string;
  Verkoopkans?: { id: string; name: string };
  Contactpersoon?: { id: string; name: string };
  Locatie?: { id: string; name: string };
  Modified_Time: string;
};

export const showroomAfspraakGeweest: Workflow<Payload> = {
  id: "showroom-afspraak-geweest",
  description: "Showroom-afspraak naar Geweest → tijdlijn-mijlpaal + review-followup queue",

  trigger: {
    name: "zoho.showroom.edit",
    description: "Zoho webhook on Showroom edit",
    parse: (input) => payloadSchema.parse(input),
  },

  async run(payload: Payload, ctx: WorkflowContext): Promise<WorkflowResult> {
    if (payload.status !== TRIGGER_STATE) {
      return { status: "skipped", message: `status=${payload.status}` };
    }

    const showroom = await ctx.records.get<ShowroomRecord>("Showroom", payload.showroomId);
    if (!showroom) return { status: "error", message: "Showroom record not found" };

    const milestoneCheck = await ctx.records.search("Datums_2", {
      criteria: `(Verkoopkans:equals:${showroom.Verkoopkans?.id ?? ""})and(Code:equals:SHOWROOM-GEWEEST)`,
      perPage: 1,
    });
    if (milestoneCheck.data.length > 0) {
      return { status: "skipped", message: "Milestone already exists" };
    }

    const created = await ctx.records.create("Datums_2", [
      {
        Name: `Showroom-bezoek ${showroom.Name ?? payload.showroomId}`,
        Fase: "Verkoopkans",
        Code: "SHOWROOM-GEWEEST",
        Omschrijving: "Showroom afspraak bijgewoond",
        Verkoopkans: showroom.Verkoopkans?.id,
        Contactpersoon: showroom.Contactpersoon?.id,
        Status_acceptatie: "Approved",
      },
    ]);

    return {
      status: "ok",
      message: "Tijdlijn-mijlpaal aangemaakt",
      data: { milestoneId: created.data[0]?.details.id },
    };
  },
};
