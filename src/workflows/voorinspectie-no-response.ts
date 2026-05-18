import { z } from "zod";
import type { Workflow, WorkflowContext, WorkflowResult } from "./types.js";

/**
 * Cron-getriggerde workflow: Voorinspecties die >= 3 dagen vastzitten in
 * "Wachten op bevestiging" zonder dat de klant reageert, krijgen status
 * "Geen reactie" + er wordt een Tijdlijn-mijlpaal aangemaakt voor de
 * accountmanager om te bellen.
 *
 * Past op de Voorinspectie blueprint: Wachten op bevestiging → Geen reactie
 * → Accountmanager belt klant (zie src/zoho/blueprints/voorinspectie.ts).
 */

const payloadSchema = z.object({
  daysWaiting: z.number().int().positive().default(3),
  dryRun: z.boolean().default(false),
});

type Payload = z.infer<typeof payloadSchema>;

type VoorinspectieScan = {
  [k: string]: unknown;
  id: string;
  Name: string;
  Status: string;
  Modified_Time: string;
  Accountmanager?: { id: string; name: string };
  Contactpersoon?: { id: string; name: string };
};

export const voorinspectieNoResponse: Workflow<Payload> = {
  id: "voorinspectie-no-response",
  description: "Voorinspecties die N dagen in 'Wachten op bevestiging' staan → Geen reactie",

  trigger: {
    name: "cron.voorinspectie.no_response",
    description: "Daily scan for stuck Voorinspecties",
    parse: (input) => payloadSchema.parse(input ?? {}),
  },

  async run(payload: Payload, ctx: WorkflowContext): Promise<WorkflowResult> {
    const cutoff = new Date(ctx.now.getTime() - payload.daysWaiting * 24 * 60 * 60 * 1000);
    const cutoffIso = cutoff.toISOString();

    const stuck = await ctx.records.search<VoorinspectieScan>("Voorinspecties", {
      criteria: `(Status:equals:Wachten op bevestiging)and(Modified_Time:before:${cutoffIso})`,
      perPage: 200,
    });

    const summary = { scanned: stuck.data.length, transitioned: 0, milestonesCreated: 0 };

    for (const vi of stuck.data) {
      if (payload.dryRun) continue;

      await ctx.records.update("Voorinspecties", [{ id: vi.id, Status: "Geen reactie" }], [
        "blueprint",
      ]);
      summary.transitioned++;

      await ctx.records.create("Datums_2", [
        {
          Name: `Bellen ${vi.Name}`,
          Fase: "Voorinspectie",
          Code: "VI-GEEN-REACTIE",
          Omschrijving: `Voorinspectie ${vi.Name}: klant ${payload.daysWaiting}+ dagen geen reactie`,
          Voorinspecties: vi.id,
          Contactpersoon: vi.Contactpersoon?.id,
          Status_acceptatie: "Pending",
        },
      ]);
      summary.milestonesCreated++;
    }

    return { status: "ok", data: { ...summary, cutoff: cutoffIso, dryRun: payload.dryRun } };
  },
};
