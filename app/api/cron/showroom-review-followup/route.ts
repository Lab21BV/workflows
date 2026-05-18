import { NextRequest, NextResponse } from "next/server";
import { RecordsApi, ZohoClient } from "@/src/zoho";

export const runtime = "nodejs";
export const maxDuration = 60;

interface ShowroomCronRecord {
  [k: string]: unknown;
  id: string;
  Name?: string;
  Fase: string;
  Verkoopkans?: { id: string; name?: string };
  Contactpersoon?: { id: string; name?: string };
  Modified_Time: string;
}

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const zoho = new ZohoClient();
  const records = new RecordsApi(zoho);

  const now = new Date();
  const lower = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const upper = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();

  const showrooms = await records.search<ShowroomCronRecord>("Showroom", {
    criteria: `(Fase:equals:Geweest)and(Modified_Time:between:${lower},${upper})`,
    perPage: 200,
  });

  const summary = { scanned: showrooms.data.length, created: 0, skipped: 0, errors: 0 };
  const created: string[] = [];

  for (const sr of showrooms.data) {
    try {
      const existing = await records.search("Reviews", {
        criteria: `(Verkoopkans:equals:${sr.Verkoopkans?.id ?? ""})`,
        perPage: 1,
      });
      if (existing.data.length > 0) {
        summary.skipped++;
        continue;
      }
      const review = await records.create("Reviews", [
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
      console.error("review followup error", err, sr.id);
      summary.errors++;
    }
  }

  return NextResponse.json({ ...summary, created, window: { lower, upper } });
}
