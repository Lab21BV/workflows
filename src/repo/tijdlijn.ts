import { ZohoClient } from "../zoho/client";
import { RecordsApi } from "../zoho/records";

const records = new RecordsApi(new ZohoClient());

export async function logEvent(voorinspectieId: string, event: string): Promise<string | null> {
  const res = await records.create("Datums_2", [
    {
      Name: `VI ${voorinspectieId} — ${new Date().toISOString().slice(0, 16).replace("T", " ")}`,
      Fase: "Voorinspectie",
      Code: "VI-RESCHEDULE",
      Omschrijving: event,
      Voorinspectie: voorinspectieId,
      Status_acceptatie: "Approved",
    },
  ]);
  return res.data[0]?.details?.id ?? null;
}
