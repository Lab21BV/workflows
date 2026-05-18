import { z } from "zod";
import type { Workflow, WorkflowContext, WorkflowResult } from "./types";
import { KS_TYPES, type KsType } from "../zoho/blueprints/klantenservice";

/**
 * Webhook-getriggerde workflow: nieuwe Klantenservice klacht binnen → toewijzen
 * aan accountmanager van de gerelateerde Verkooporder + mijlpaal in tijdlijn.
 *
 * Trigger: Zoho webhook op `Klantenservice` create → POST naar /api/webhooks/zoho
 * met X-Workflow: klantenservice-nieuw-toewijzen.
 */

const typeSchema = z.enum(KS_TYPES);

const payloadSchema = z.object({
  klantenserviceId: z.string().min(1),
  type: typeSchema.optional(),
});

type Payload = z.infer<typeof payloadSchema>;

type KsRecord = {
  [k: string]: unknown;
  id: string;
  Name: string;
  Type?: KsType;
  Verkooporder?: { id: string; name: string };
  Order_voor_oplossing?: { id: string; name: string };
  Oorzaak?: string;
};

type SalesOrderRecord = {
  [k: string]: unknown;
  id: string;
  Owner?: { id: string; name: string };
  Account_Name?: { id: string; name: string };
};

export const klantenserviceNieuw: Workflow<Payload> = {
  id: "klantenservice-nieuw-toewijzen",
  description: "Nieuwe Klantenservice klacht → toewijzen aan verkooporder-eigenaar + tijdlijn",

  trigger: {
    name: "zoho.klantenservice.create",
    description: "Zoho webhook on Klantenservice create",
    parse: (input) => payloadSchema.parse(input),
  },

  async run(payload: Payload, ctx: WorkflowContext): Promise<WorkflowResult> {
    const ks = await ctx.records.get<KsRecord>("Klantenservice", payload.klantenserviceId);
    if (!ks) return { status: "error", message: "Klantenservice record not found" };

    const verkooporderId = ks.Verkooporder?.id;
    let assignTo: string | undefined;
    if (verkooporderId) {
      const order = await ctx.records.get<SalesOrderRecord>("Sales_Orders", verkooporderId);
      assignTo = order?.Owner?.id;
    }

    if (assignTo) {
      await ctx.records.update("Klantenservice", [{ id: ks.id, Owner: assignTo }]);
    }

    await ctx.records.create("Datums_2", [
      {
        Name: `Klacht ${ks.Name}`,
        Fase: "Klantenservice",
        Code: "KS-NIEUW",
        Omschrijving: `Nieuwe ${ks.Type ?? "klacht"}: ${ks.Name}`,
        Klantenservice: ks.id,
        Verkooporder: verkooporderId,
        Status_acceptatie: "Pending",
      },
    ]);

    return {
      status: "ok",
      message: assignTo ? "Owner toegewezen + mijlpaal aangemaakt" : "Mijlpaal aangemaakt (geen owner)",
      data: { assignedTo: assignTo, verkooporderId },
    };
  },
};
