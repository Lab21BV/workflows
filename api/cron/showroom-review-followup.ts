import { RecordsApi, ZohoClient } from "../../src/zoho/index.js";

export const config = { runtime: "nodejs", maxDuration: 60 };

/**
 * Cron job (zie vercel.json `crons`):
 *
 * Loopt elke dag om 09:00 (CET via Vercel UTC offset) en doet:
 *   1. Zoek Showroom-records met Fase=Geweest en Modified_Time ≥ 3 dagen geleden
 *      en ≤ 30 dagen geleden (om eindeloos terug-scannen te vermijden).
 *   2. Voor elk: check of er al een Review record bestaat met die Verkoopkans.
 *      Zo niet: maak een Reviews-record aan en log een Tijdlijn-mijlpaal.
 *
 * Vercel beschermt cron endpoints met een Bearer token in `Authorization`,
 * gegenereerd via env var CRON_SECRET. Configureer dezelfde waarde in Vercel
 * project settings.
 */

interface VercelRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
}
interface VercelResponse {
  status(code: number): VercelResponse;
  json(body: object): void;
}

type ShowroomCronRecord = {
  [k: string]: unknown;
  id: string;
  Name?: string;
  Fase: string;
  Verkoopkans?: { id: string; name?: string };
  Contactpersoon?: { id: string; name?: string };
  Modified_Time: string;
};

function isAuthorized(req: VercelRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // No secret configured: allow (local/dev)
  const header = req.headers["authorization"];
  const value = Array.isArray(header) ? header[0] : header;
  return value === `Bearer ${secret}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!isAuthorized(req)) {
    res.status(401).json({ error: "unauthorized" });
    return;
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

  res.status(200).json({ ...summary, created, window: { lower, upper } });
}
