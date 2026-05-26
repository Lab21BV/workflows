import { z } from "zod";

/**
 * Inmeetformulier vloerverwarming — schema + veld-metadata voor rendering.
 * Bron: `temp/LAB21_Inmeetformulier Vloerverwarming.pdf` (LAB21, mei 2026).
 *
 * Pagina's 2-3 van de PDF zijn de installatievoorwaarden — die staan in
 * `app/inmeetformulier/_Voorwaarden.tsx`.
 */

export const JA_NEE = ["Ja", "Nee"] as const;
export type JaNee = (typeof JA_NEE)[number];

export const VLOER_TYPE = [
  "Cementdekvloer",
  "Anhydrietvloer",
  "Anders, graag overleg",
] as const;
export type VloerType = (typeof VLOER_TYPE)[number];

export const DROOGBOUW_TYPE = [
  "Knauf / fermacell",
  "Knauf Brio 23 (WF) of fermacell 2E22/2E26 of 2E33 (geschikt voor vloerverwarming)",
] as const;
export type DroogbouwType = (typeof DROOGBOUW_TYPE)[number];

export const RUIMTE_VERDIEPING = ["Begane grond", "Etage"] as const;
export type RuimteVerdieping = (typeof RUIMTE_VERDIEPING)[number];

export const POMPVERDELER = [
  "Open RVS LT verdeler",
  "Composiet pompverdeler",
] as const;
export type Pompverdeler = (typeof POMPVERDELER)[number];

const ruimteSchema = z.object({
  verdieping: z.enum(RUIMTE_VERDIEPING),
  nettoOppervlakteM2: z.coerce.number().positive("Vul een positief aantal m² in"),
});

export const inmeetFormSchema = z.object({
  // Algemeen
  naamKlant: z.string().min(2, "Vul je naam in"),
  installatieAdres: z.string().min(3, "Vul het installatie-adres in"),
  postcode: z.string().min(4, "Vul de postcode in"),
  email: z.string().email("Geen geldig e-mailadres"),
  telefoon: z.string().min(6, "Vul een geldig telefoonnummer in"),
  typeWoonhuis: z.string().min(2, "Vul het type woonhuis in"),
  bouwjaarWoning: z.coerce
    .number()
    .int()
    .min(1800)
    .max(new Date().getFullYear() + 1),
  kruipruimteAanwezig: z.enum(JA_NEE),

  // Vloer
  dekvloer: z.enum(VLOER_TYPE),
  droogbouwvloer: z.enum(DROOGBOUW_TYPE).optional(),
  leidingInDekvloerAanwezig: z.enum(JA_NEE),

  // Ruimtes — minimaal 1, max 6 (PDF heeft 3, we maken 'm rekkelijk)
  ruimtes: z.array(ruimteSchema).min(1, "Vul minstens één ruimte in").max(6),

  // Verdeler
  aanvoerRetourleidingAanwezig: z.enum(JA_NEE),
  positieVerdeler: z.string().min(2),
  diameterCvLeidingenMm: z.coerce.number().positive(),
  stopcontactAanwezig: z.enum(JA_NEE),

  // Verwarmingsbron
  cvKetelMerk: z.string().optional(),
  stadsverwarming: z.enum(JA_NEE),
  thermostaatAanwezig: z.enum(JA_NEE).optional(),
  warmtepomp: z.enum(JA_NEE),
  pompverdelerType: z.enum(POMPVERDELER).optional(),

  // Foto's — klant bevestigt dat hij ze (los) aanlevert
  fotoRuimte: z.boolean().default(false),
  fotoVerdelerplek: z.boolean().default(false),
  fotoCvKetel: z.boolean().default(false),
  fotoWarmtepompverdeler: z.boolean().default(false),
  fotoToelichting: z.string().optional(),

  // Bevestiging
  installatievoorwaardenGelezen: z.literal(true, {
    errorMap: () => ({ message: "Bevestig dat je de installatievoorwaarden gelezen hebt" }),
  }),
});

export type InmeetForm = z.infer<typeof inmeetFormSchema>;

/**
 * Veld-metadata voor render-volgorde + labels. Houden we los van het
 * zod-schema zodat we typing én UI-tekst onafhankelijk kunnen iteren.
 */
export const VELD_LABELS: Record<keyof InmeetForm, string> = {
  naamKlant: "Naam klant",
  installatieAdres: "Installatie-adres",
  postcode: "Postcode",
  email: "E-mail",
  telefoon: "Telefoonnummer",
  typeWoonhuis: "Type woonhuis",
  bouwjaarWoning: "Bouwjaar woning",
  kruipruimteAanwezig: "Kruipruimte aanwezig?",
  dekvloer: "Dekvloer",
  droogbouwvloer: "Droogbouwvloer (indien van toepassing)",
  leidingInDekvloerAanwezig: "Leiding in de dekvloer aanwezig?",
  ruimtes: "Ruimtes",
  aanvoerRetourleidingAanwezig: "Aanvoer/retourleiding aanwezig?",
  positieVerdeler: "Positie verdeler",
  diameterCvLeidingenMm: "Diameter CV-leidingen (mm)",
  stopcontactAanwezig: "Stopcontact aanwezig?",
  cvKetelMerk: "CV-ketel / merk",
  stadsverwarming: "Stadsverwarming",
  thermostaatAanwezig: "Thermostaat aanwezig?",
  warmtepomp: "Warmtepomp",
  pompverdelerType: "Type pompverdeler",
  fotoRuimte: "Foto: ruimte waar de vloerverwarming komt te liggen",
  fotoVerdelerplek: "Foto: plek waar de verdeler komt te liggen",
  fotoCvKetel: "Foto: CV-ketel en merk",
  fotoWarmtepompverdeler: "Foto: warmtepomp verdeler",
  fotoToelichting: "Hoe lever je de foto's aan? (mail / WhatsApp)",
  installatievoorwaardenGelezen: "Ik bevestig dat ik de installatievoorwaarden heb gelezen",
};

/**
 * Formatteert een ingevuld formulier als Markdown-achtige tekst die
 * we kunnen pushen naar Datums_2.Omschrijving (Zoho limiet ~32k).
 */
export function formatInmeetSamenvatting(data: InmeetForm): string {
  const lines: string[] = [];
  lines.push("INMEETFORMULIER VLOERVERWARMING");
  lines.push("");
  lines.push("== Klant ==");
  lines.push(`Naam:            ${data.naamKlant}`);
  lines.push(`Adres:           ${data.installatieAdres}, ${data.postcode}`);
  lines.push(`E-mail:          ${data.email}`);
  lines.push(`Telefoon:        ${data.telefoon}`);
  lines.push(`Type woonhuis:   ${data.typeWoonhuis}`);
  lines.push(`Bouwjaar:        ${data.bouwjaarWoning}`);
  lines.push(`Kruipruimte:     ${data.kruipruimteAanwezig}`);
  lines.push("");
  lines.push("== Vloer ==");
  lines.push(`Dekvloer:        ${data.dekvloer}`);
  if (data.droogbouwvloer) lines.push(`Droogbouwvloer:  ${data.droogbouwvloer}`);
  lines.push(`Leiding in dekvloer: ${data.leidingInDekvloerAanwezig}`);
  lines.push("");
  lines.push("== Ruimtes ==");
  data.ruimtes.forEach((r, i) =>
    lines.push(`Ruimte ${i + 1}: ${r.verdieping} — ${r.nettoOppervlakteM2} m²`),
  );
  lines.push("");
  lines.push("== Verdeler ==");
  lines.push(`Aanvoer/retour:  ${data.aanvoerRetourleidingAanwezig}`);
  lines.push(`Positie:         ${data.positieVerdeler}`);
  lines.push(`Ø CV-leiding:    ${data.diameterCvLeidingenMm} mm`);
  lines.push(`Stopcontact:     ${data.stopcontactAanwezig}`);
  lines.push("");
  lines.push("== Verwarmingsbron ==");
  if (data.cvKetelMerk) lines.push(`CV-ketel:        ${data.cvKetelMerk}`);
  lines.push(`Stadsverwarming: ${data.stadsverwarming}`);
  if (data.thermostaatAanwezig)
    lines.push(`Thermostaat:     ${data.thermostaatAanwezig}`);
  lines.push(`Warmtepomp:      ${data.warmtepomp}`);
  if (data.pompverdelerType)
    lines.push(`Pompverdeler:    ${data.pompverdelerType}`);
  lines.push("");
  lines.push("== Foto's ==");
  const fotos = [
    data.fotoRuimte && "ruimte",
    data.fotoVerdelerplek && "verdelerplek",
    data.fotoCvKetel && "CV-ketel",
    data.fotoWarmtepompverdeler && "warmtepompverdeler",
  ].filter(Boolean);
  lines.push(`Aangeleverd:     ${fotos.length ? fotos.join(", ") : "geen"}`);
  if (data.fotoToelichting) lines.push(`Toelichting:     ${data.fotoToelichting}`);
  lines.push("");
  lines.push("Installatievoorwaarden gelezen: ja");
  return lines.join("\n");
}
