/**
 * Showroom-afspraak blueprint — uit module `Showroom` (Afspraken).
 * Bron: `data/zoho/Showroom.json` (Fase + Stage picklists, actual_values).
 */

export const SHOWROOM_FASES = ["Ingepland", "Aangemeld", "Geweest", "Geannuleerd"] as const;
export type ShowroomFase = (typeof SHOWROOM_FASES)[number];

export const SHOWROOM_STAGES = [
  "Showroom Visit",
  "Showroom afspraak (op locatie)",
  "Showroom afspraak (vervolg)",
] as const;
export type ShowroomStage = (typeof SHOWROOM_STAGES)[number];

export const SHOWROOM_INTERESSE = ["Vloer", "Trap", "Raamdecoratie", "Gordijn", "Hor"] as const;
export type ShowroomInteresse = (typeof SHOWROOM_INTERESSE)[number];

export const SHOWROOM_TRANSITIONS: Record<ShowroomFase, ShowroomFase[]> = {
  Ingepland: ["Aangemeld", "Geannuleerd"],
  Aangemeld: ["Geweest", "Geannuleerd"],
  Geweest: [],
  Geannuleerd: [],
};
