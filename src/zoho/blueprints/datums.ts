/**
 * Datums_2 (Tijdlijn) — centrale milestone-module die naar alle business
 * entiteiten kan linken. Bron: `data/zoho/Datums_2.json`.
 */

export const DATUMS_FASES = [
  "Verkoopkans1",
  "Verkoopkans",
  "Klantenservice",
  "Voorinspectie",
  "Planning",
  "Verkooporder",
  "Offerte",
] as const;
export type DatumsFase = (typeof DATUMS_FASES)[number];

export const DATUMS_STATUS = ["Pending", "Approved", "Afgewezen"] as const;
export type DatumsStatus = (typeof DATUMS_STATUS)[number];
