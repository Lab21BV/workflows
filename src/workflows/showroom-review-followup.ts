import { z } from "zod";
import type { Workflow, WorkflowContext, WorkflowResult } from "./types";

/**
 * Cron: drie dagen na een showroom-bezoek (Fase=Geweest) een review-aanvraag
 * aanmaken voor de klant. Skipt records die al een Reviews-record hebben.
 */

const payloadSchema = z.object({
  minDaysAgo: z.number().int().positive().default(3),
  maxDaysAgo: z.number().int().positive().default(30),
  perPage: z.number().int().positive().max(200).default(200),
});

type Payload = z.infer<typeof payloadSchema>;

interface ShowroomRecord {
  [k: string]: unknown;
  id: string;
  Name?: string;
  Fase: string;
  Verkoopkans?: { id: string; name?: string };
  Contactpersoon?: { id: string; name?: string };
  Modified_Time: string;
}

export const showroomReviewFollowup: Workflow<Payload> = {
  id: "showroom-review-followup",
  description: "Drie dagen na Showroom Fase=Geweest een review-aanvraag aanmaken",

  trigger: {
    name: "cron.showroom.review_followup",
    description: "Daily scan of Showroom records ready for review request",
    parse: (input) => payloadSchema.parse(input ?? {}),
  },

  async run(payload: Payload, ctx: WorkflowContext): Promise<WorkflowResult> {
    const lower = new Date(ctx.now.getTime() - payload.maxDaysAgo * 24 * 60 * 60 * 1000).toISOString();
    const upper = new Date(ctx.now.getTime() - payload.minDaysAgo * 24 * 60 * 60 * 1000).toISOString();

    const showrooms = await ctx.records.search<ShowroomRecord>("Showroom", {
      criteria: `(Fase:equals:Geweest)and(Modified_Time:between:${lower},${upper})`,
      perPage: payload.perPage,
    });

    const summary = { scanned: showrooms.data.length, created: 0, skipped: 0, errors: 0 };
    const created: string[] = [];

    for (const sr of showrooms.data) {
      try {
        const existing = await ctx.records.search("Reviews", {
          criteria: `(Verkoopkans:equals:${sr.Verkoopkans?.id ?? ""})`,
          perPage: 1,
        });
        if (existing.data.length > 0) {
          summary.skipped++;
          continue;
        }
        const review = await ctx.records.create("Reviews", [
          {
            Name: `Review-aanvraag ${sr.Name ?? sr.id}`,
            Verkoopkans: sr.Verkoopkans?.id,
            Contactpersoon: sr.Contactpersoon?.id,
          },
        ]);
        summary.created++;
        const id = review.data[0]?.details.id;
        if (id) created.push(id);
      } catch (err) {
        ctx.logger.error("showroom-review-followup error", {
          showroomId: sr.id,
          error: (err as Error).message,
        });
        summary.errors++;
      }
    }

    return {
      status: "ok",
      data: { ...summary, created, window: { lower, upper } },
    };
  },
};
