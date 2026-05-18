/**
 * Klantenservice (Support) — uit module `Klantenservice`.
 * Bron: `data/zoho/Klantenservice.json` (actual_values).
 *
 * Module heeft autonumber prefix met datum: `SUP${dd}${MM}${yy}`.
 */

export const KS_TYPES = ["Klacht", "Service", "Klacht en service"] as const;
export type KsType = (typeof KS_TYPES)[number];

export const KS_OORZAKEN = [
  "Aannemer",
  "Leverancier",
  "Lab21 verkoper",
  "Lab21 accountmanager",
  "Lab21 inkoop en planning",
  "Lab21 legger management",
] as const;
export type KsOorzaak = (typeof KS_OORZAKEN)[number];

export const KS_OPLOSSINGEN = [
  "Herstel uitgevoerd door oorspronkelijke aannemer",
  "Herstel uitgevoerd door nieuwe aannemer",
  "Compensatie met VSO",
  "Compensatie zonder VSO",
  "Compensatie op basis van uitspraak UZ",
  "Compensatie op basis van uitspraak rechtbank",
  "Volledig afgewezen",
  "Ontbinden",
] as const;
export type KsOplossing = (typeof KS_OPLOSSINGEN)[number];

export const KS_RELATIE_KLANT = [
  "Zeer boos",
  "Boos",
  "Neutral",
  "Vriendelijk",
  "Goede relatie",
] as const;
export type KsRelatieKlant = (typeof KS_RELATIE_KLANT)[number];

export const KS_FYSIEKE_OMSTANDIGHEID = [
  "Jong",
  "Bejaard",
  "Zwangere vrouw",
  "Ziek",
] as const;
export type KsFysiekeOmstandigheid = (typeof KS_FYSIEKE_OMSTANDIGHEID)[number];

export const KS_STATUS = [
  "Optie 1",
  "Optie 2",
  "In afwachting van reaktie klant",
] as const;
export type KsStatus = (typeof KS_STATUS)[number];
