import { ZohoClient } from "../zoho/client";
import { RecordsApi } from "../zoho/records";
import type { Outcome, VoorinspectieRecord } from "../workflows/vi-reschedule/types";

const records = new RecordsApi(new ZohoClient());

type RawVI = Record<string, unknown> & {
  id: string;
  Datum_tijd?: string;
  VI_Voorstel_Status?: string;
  VI_Voorgestelde_Datum?: string;
  VI_Voorgesteld_Door?: string;
  VI_Buffer_Snapshot_Dagen?: number;
  VI_Branch_Gekozen?: string;
  VI_Nieuwe_Leverdatum_Voorstel?: string;
  VI_Toelichting_Klant?: string;
  VI_Tegenpartij_Reactie?: string;
  VI_Geaccepteerd_Tijdslot_Van?: string;
  Verkooporders?: { id: string };
};

export async function get(id: string, leverdatumOrigineel: string): Promise<VoorinspectieRecord | null> {
  const r = await records.get<RawVI>("Voorinspecties", id);
  if (!r) return null;
  return {
    id: r.id,
    Leverdatum_Origineel: leverdatumOrigineel,
    Datum_tijd: r.Datum_tijd ?? null,
    VI_Voorstel_Status: (r.VI_Voorstel_Status as VoorinspectieRecord["VI_Voorstel_Status"]) ?? "none",
    VI_Voorgestelde_Datum: r.VI_Voorgestelde_Datum ?? null,
    VI_Voorgesteld_Door: (r.VI_Voorgesteld_Door as "aannemer" | "klant" | undefined) ?? null,
    VI_Buffer_Snapshot_Dagen: r.VI_Buffer_Snapshot_Dagen ?? null,
    VI_Branch_Gekozen:
      (r.VI_Branch_Gekozen as VoorinspectieRecord["VI_Branch_Gekozen"]) ?? null,
    VI_Nieuwe_Leverdatum_Voorstel: r.VI_Nieuwe_Leverdatum_Voorstel ?? null,
    VI_Toelichting_Klant: r.VI_Toelichting_Klant ?? null,
    VI_Tegenpartij_Reactie:
      (r.VI_Tegenpartij_Reactie as VoorinspectieRecord["VI_Tegenpartij_Reactie"]) ?? null,
    VI_Geaccepteerd_Tijdslot_Van: r.VI_Geaccepteerd_Tijdslot_Van ?? null,
  };
}

export async function getSalesOrderId(id: string): Promise<string | null> {
  const r = await records.get<RawVI>("Voorinspecties", id);
  return r?.Verkooporders?.id ?? null;
}

export async function update(id: string, patch: Record<string, unknown>): Promise<void> {
  await records.update("Voorinspecties", [{ id, ...patch }]);
}

export async function setBufferSnapshot(id: string, dagen: number): Promise<void> {
  await update(id, { VI_Buffer_Snapshot_Dagen: dagen });
}

export function outcomesToPatch(outcomes: Outcome[]): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const o of outcomes) {
    if (o.kind === "set_status") patch.VI_Voorstel_Status = o.status;
    if (o.kind === "commit_vi_datetime") patch.Datum_tijd = o.datetime;
  }
  return patch;
}
