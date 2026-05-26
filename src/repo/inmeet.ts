import { desc, eq } from "drizzle-orm";
import { db, schema } from "../db";
import { getRecordsApi as records } from "../zoho";
import {
  formatInmeetSamenvatting,
  type InmeetForm,
} from "../data/inmeet-form-schema";

const DATUMS_CODE = "INMEET-VLOERVERWARMING";

export type StoredSubmission = {
  id: string;
  zohoOrderId: string;
  payload: InmeetForm;
  zohoDatumsId: string | null;
  submittedAt: Date;
};

/**
 * Slaat een inmeetformulier op in Postgres en pusht een samenvatting
 * naar Zoho Datums_2 zodat het op de tijdlijn van de order verschijnt.
 * Postgres is de bron van waarheid voor de gestructureerde data; Zoho
 * krijgt alleen een human-readable rendering.
 */
export async function persistAndPush(
  zohoOrderId: string,
  payload: InmeetForm,
): Promise<{ submissionId: string; datumsId: string | null }> {
  const inserted = await db
    .insert(schema.inmeetSubmissions)
    .values({ zohoOrderId, payload })
    .returning({ id: schema.inmeetSubmissions.id });
  const row = inserted[0];
  if (!row) throw new Error("Insert inmeet_submissions retourneerde geen rij");

  let datumsId: string | null = null;
  try {
    const samenvatting = formatInmeetSamenvatting(payload);
    const res = await records().create("Datums_2", [
      {
        Name: `Inmeetformulier ${payload.naamKlant} — ${new Date()
          .toISOString()
          .slice(0, 10)}`,
        Fase: "Verkooporder",
        Code: DATUMS_CODE,
        Omschrijving: samenvatting,
        Verkooporder: zohoOrderId,
        Status_acceptatie: "Approved",
      },
    ]);
    datumsId = res.data[0]?.details?.id ?? null;
    if (datumsId) {
      await db
        .update(schema.inmeetSubmissions)
        .set({ zohoDatumsId: datumsId })
        .where(eq(schema.inmeetSubmissions.id, row.id));
    }
  } catch (err) {
    // Postgres-rij blijft staan zodat de submission niet verloren gaat —
    // de Zoho-push kan later opnieuw via een reconciliation-cron.
    console.error("Zoho Datums_2 push failed:", (err as Error).message);
  }

  return { submissionId: row.id, datumsId };
}

export async function listForOrder(zohoOrderId: string): Promise<StoredSubmission[]> {
  const rows = await db
    .select()
    .from(schema.inmeetSubmissions)
    .where(eq(schema.inmeetSubmissions.zohoOrderId, zohoOrderId))
    .orderBy(desc(schema.inmeetSubmissions.submittedAt));
  return rows.map((r) => ({
    id: r.id,
    zohoOrderId: r.zohoOrderId,
    payload: r.payload as InmeetForm,
    zohoDatumsId: r.zohoDatumsId,
    submittedAt: r.submittedAt,
  }));
}
