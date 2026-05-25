import { z } from "zod";
import type { Workflow, WorkflowContext, WorkflowResult } from "./types";
import { runReschedule } from "./vi-reschedule/run";

/**
 * Reconciliation cron: Voorinspecties die ≥ N uur in een non-terminal
 * VI_Voorstel_Status hangen, opnieuw door de reschedule-orchestrator sturen.
 * Vangnet voor gemiste webhooks.
 */

const TERMINAL = ["done", "rejected", "none"];

const payloadSchema = z.object({
  staleHours: z.number().int().positive().default(24),
  perPage: z.number().int().positive().max(200).default(50),
});

type Payload = z.infer<typeof payloadSchema>;

export const viRescheduleStuck: Workflow<Payload> = {
  id: "vi-reschedule-stuck",
  description: "Reconciliation scan voor vastgelopen VI-reschedule rondes",

  trigger: {
    name: "cron.voorinspectie.reschedule_stuck",
    description: "Daily reconciliation of non-terminal VI_Voorstel_Status records",
    parse: (input) => payloadSchema.parse(input ?? {}),
  },

  async run(payload: Payload, ctx: WorkflowContext): Promise<WorkflowResult> {
    const cutoff = new Date(ctx.now.getTime() - payload.staleHours * 60 * 60 * 1000).toISOString();
    const notTerminal = TERMINAL.map((s) => `(VI_Voorstel_Status:not_equal:${s})`).join("and");
    const criteria = `${notTerminal}and(Modified_Time:before:${cutoff})`;
    const res = await ctx.records.search<{ id: string }>("Voorinspecties", {
      criteria,
      perPage: payload.perPage,
    });

    const processed: { id: string; outcomes: number }[] = [];
    for (const r of res.data) {
      try {
        const out = await runReschedule({ voorinspectieId: r.id });
        processed.push({ id: r.id, outcomes: out.outcomes.length });
      } catch (err) {
        ctx.logger.error("vi-reschedule-stuck reconciliation failed", {
          voorinspectieId: r.id,
          error: (err as Error).message,
        });
      }
    }

    return {
      status: "ok",
      data: {
        checked: res.data.length,
        processed: processed as unknown as Record<string, unknown>,
        cutoff,
      },
    };
  },
};
