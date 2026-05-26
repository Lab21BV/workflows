/**
 * Planning-tijdlijn: codes + volgorderegels voor de uitvoeringsketen.
 *
 * Bron: handmatig vastgelegd door Victor (mei 2026). Dit is de
 * doelarchitectuur — de meeste regels zijn nog NIET als logica
 * geïmplementeerd. Zie `status` op elke regel voor de feitelijke
 * codestatus.
 *
 * De codes (A01…V01) zijn een nieuwe taxonomie. De bestaande Datums_2
 * picklist gebruikt nog DE-/KL-/LA-codes (zie `src/zoho/blueprints/tijdlijn.ts`)
 * — migratie van die picklist naar deze codeset is een open punt.
 */

export type Uitvoerder = "Lab21" | "Klant" | "Derden";

export interface TijdlijnCode {
  code: string;
  uitvoerder: Uitvoerder;
  omschrijving: string;
  /** Wordt deze datum bij de klant uitgevraagd via "Extra vragen"? */
  extraVragen: boolean;
}

export const TIJDLIJN_CODES: TijdlijnCode[] = [
  { code: "A01", uitvoerder: "Derden", omschrijving: "Oplevering nieuwbouw", extraVragen: true },
  { code: "B01", uitvoerder: "Klant", omschrijving: "Sleuteloverdracht", extraVragen: true },
  { code: "C01", uitvoerder: "Derden", omschrijving: "Oplevering aanbouw", extraVragen: true },
  { code: "C02", uitvoerder: "Derden", omschrijving: "Vloerverwarming aanleggen", extraVragen: true },
  { code: "C03", uitvoerder: "Derden", omschrijving: "Oplevering verbouw", extraVragen: true },
  { code: "D01", uitvoerder: "Derden", omschrijving: "Storten dekvloer nieuwbouw", extraVragen: true },
  { code: "D02", uitvoerder: "Derden", omschrijving: "Storten dekvloer verbouw", extraVragen: true },
  { code: "D03", uitvoerder: "Derden", omschrijving: "Storten dekvloer aanbouw", extraVragen: true },
  { code: "D04", uitvoerder: "Derden", omschrijving: "Storten dekvloer muur", extraVragen: true },
  { code: "D05", uitvoerder: "Derden", omschrijving: "Trap installatie", extraVragen: true },
  { code: "E01", uitvoerder: "Klant", omschrijving: "Vloerverwarming - Activeren", extraVragen: true },
  { code: "F01", uitvoerder: "Klant", omschrijving: "Opstookprotocol - Begin/Eind", extraVragen: true },
  { code: "H01", uitvoerder: "Derden", omschrijving: "Verwijderen muur", extraVragen: true },
  { code: "I01", uitvoerder: "Derden", omschrijving: "Verwijderen vloer", extraVragen: true },
  { code: "I02", uitvoerder: "Lab21", omschrijving: "Verwijderen vloer", extraVragen: false },
  { code: "I03", uitvoerder: "Lab21", omschrijving: "Saneren ondergrond", extraVragen: false },
  { code: "J01", uitvoerder: "Klant", omschrijving: "Beoordeling basisvloer (volledig leeg)", extraVragen: true },
  { code: "J02", uitvoerder: "Derden", omschrijving: "Electra begin/eind", extraVragen: true },
  { code: "L01", uitvoerder: "Derden", omschrijving: "Stucwerk begin/eind", extraVragen: true },
  { code: "L02", uitvoerder: "Derden", omschrijving: "Schilderwerk begin/eind", extraVragen: true },
  { code: "M01", uitvoerder: "Klant", omschrijving: "Einde droogperiode stucwerk (eind stucwerk + 2 weken)", extraVragen: true },
  { code: "M02", uitvoerder: "Klant", omschrijving: "Einde droogperiode schilderwerk (eind schilderwerk + 1 week)", extraVragen: true },
  { code: "O01", uitvoerder: "Derden", omschrijving: "Keuken begin/eind", extraVragen: true },
  { code: "P01", uitvoerder: "Lab21", omschrijving: "Bevestiging onderaannemer", extraVragen: false },
  { code: "Q01", uitvoerder: "Lab21", omschrijving: "Voorinspectie", extraVragen: false },
  { code: "Q02", uitvoerder: "Lab21", omschrijving: "Droogbouw", extraVragen: false },
  { code: "Q03", uitvoerder: "Lab21", omschrijving: "Vloerverwarming", extraVragen: false },
  { code: "Q04", uitvoerder: "Lab21", omschrijving: "Leverdatum", extraVragen: false },
  { code: "Q05", uitvoerder: "Klant", omschrijving: "Acclimatiseren - Begin/Eind", extraVragen: false },
  { code: "R00", uitvoerder: "Lab21", omschrijving: "Extra egaliseren voor aanleggen vloerverwarming", extraVragen: false },
  { code: "R01", uitvoerder: "Lab21", omschrijving: "1ste egalisatie", extraVragen: false },
  { code: "R02", uitvoerder: "Lab21", omschrijving: "2de egalisatie", extraVragen: false },
  { code: "S01", uitvoerder: "Lab21", omschrijving: "Leggen vloer begin/eind", extraVragen: false },
  { code: "S02", uitvoerder: "Lab21", omschrijving: "Renoveren trap", extraVragen: false },
  { code: "U01", uitvoerder: "Derden", omschrijving: "Meubels", extraVragen: true },
  { code: "V01", uitvoerder: "Klant", omschrijving: "Verhuizing", extraVragen: true },
  { code: "Z01", uitvoerder: "Lab21", omschrijving: "Vloerverwarming - Dichtzetten sleuf", extraVragen: false },
];

export interface ImplementatieRef {
  /** Workflow-id uit src/workflows/registry.ts, indien aanwezig. */
  workflowId?: string;
  /** Plek in de code waar de regel wordt afgedwongen. */
  location?: string;
}

export interface PlanningRegel {
  /** Korte expressie, zoals jij ze schreef ("S01-Q01 ≥ 7 + langste levertijd"). */
  expressie: string;
  /** Nederlandse uitleg. */
  uitleg: string;
  status: "implemented" | "planned";
  implementatie?: ImplementatieRef;
}

export const PLANNING_REGELS: PlanningRegel[] = [
  {
    expressie: "S01 - Q01 ≥ 7 + max(levertijd orderegels)",
    uitleg:
      "Voorinspectie moet minstens 7 dagen + de langste leverdagen van alle artikelen in de configurator voor de legdatum plaatsvinden.",
    status: "implemented",
    implementatie: {
      workflowId: "vi-reschedule",
      location: "src/workflows/vi-reschedule/evaluate.ts:14",
    },
  },
  {
    expressie: "R01 > M01",
    uitleg: "1ste egalisatie pas na einde droogperiode stucwerk.",
    status: "planned",
  },
  {
    expressie: "S01 > M01",
    uitleg: "Leggen pas na einde droogperiode stucwerk.",
    status: "planned",
  },
  {
    expressie: "Q01 > J01",
    uitleg: "Voorinspectie pas nadat basisvloer beoordeelbaar is (volledig leeg).",
    status: "planned",
  },
  {
    expressie: "Q01 > B01",
    uitleg: "Voorinspectie pas na sleuteloverdracht.",
    status: "planned",
  },
  {
    expressie: "Q01 > A01",
    uitleg: "Voorinspectie pas na oplevering nieuwbouw.",
    status: "planned",
  },
  {
    expressie: "Q01 > C01",
    uitleg: "Voorinspectie pas na oplevering aanbouw.",
    status: "planned",
  },
  {
    expressie: "Q01 > C03",
    uitleg: "Voorinspectie pas na oplevering verbouwing.",
    status: "planned",
  },
  {
    expressie: "Q01 > C02",
    uitleg: "Voorinspectie pas na vloerverwarming-aanleg door 3de partij.",
    status: "planned",
  },
  {
    expressie: "Q01 > I01",
    uitleg: "Voorinspectie pas na verwijderen vloer (door derden).",
    status: "planned",
  },
  {
    expressie: "Q01 > D01",
    uitleg: "Voorinspectie pas na storten dekvloer nieuwbouw.",
    status: "planned",
  },
  {
    expressie: "Q01 > D02",
    uitleg: "Voorinspectie pas na storten dekvloer verbouw.",
    status: "planned",
  },
  {
    expressie: "Q01 > D03",
    uitleg: "Voorinspectie pas na storten dekvloer aanbouw.",
    status: "planned",
  },
  {
    expressie: "Q01 > D04",
    uitleg: "Voorinspectie pas na storten dekvloer muur.",
    status: "planned",
  },
  {
    expressie: "Q01 > F01",
    uitleg:
      "Voorinspectie pas na einde opstookprotocol (definitie F01 nog te bevestigen — open vraag).",
    status: "planned",
  },
  {
    expressie: "Q01 > H01",
    uitleg: "Voorinspectie pas na verwijderen muur.",
    status: "planned",
  },
  {
    expressie: "[L02 (begin) > S01 (eind)] of [R01 > M02 of S01]",
    uitleg:
      "Schilderwerk na de legwerkzaamheden, of egalisatie/leggen na droogperiode schilderwerk.",
    status: "planned",
  },
  {
    expressie: "{J02, L01, L02, M01, M02, O01} ∉ [R01, R02, S01]",
    uitleg:
      "Geen andere werkzaamheden of droogperiodes tijdens de egalisatie/legperiode (R01-R02-S01).",
    status: "planned",
  },
  {
    expressie:
      "V01/U01 > M02 > L02 > S01 > Q05 > Q04 > R02 > R01 > Z01 > Q03 > (Q02 of R00) > I03 > Q01 > (I02 of I01)",
    uitleg:
      "Volledige volgorde-keten van achter naar voren: verhuizing/meubels → droogperiode schilder → schilder → leggen → acclimatiseren → leverdatum → 2de egalisatie → 1ste egalisatie → dichtzetten sleuf vloerverwarming → vloerverwarming → droogbouw of extra egalisatie → saneren ondergrond → voorinspectie → verwijderen vloer.",
    status: "planned",
  },
  {
    expressie: "Q05_eind - Q05_begin ≥ 2 dagen",
    uitleg: "Minimaal 48 uur acclimatiseren.",
    status: "planned",
  },
  {
    expressie: "O01 > S01 (bij lijm PVC)",
    uitleg: "Keuken pas plaatsen nadat de lijm-PVC vloer gelegd is.",
    status: "planned",
  },
  {
    expressie: "O01 < S01 (bij klik PVC / laminaat / houten vloer)",
    uitleg:
      "Keuken plaatsen vóór een zwevende vloer wordt gelegd — keuken mag niet op een zwevende vloer staan.",
    status: "planned",
  },
  {
    expressie: "S02 - D05 ≥ 9 maanden",
    uitleg: "Een nieuwe trap is pas na 9 maanden stabiel genoeg om te renoveren.",
    status: "planned",
  },
  {
    expressie: "min(Q03, Q04, R01, R00) - Q02 ≥ 3 dagen",
    uitleg:
      "Droogbouw moet minimaal 3 dagen vóór datum infrezen vloerverwarming, leverdatum, of egaliseerdatum plaatsvinden.",
    status: "planned",
  },
];

export function planningRegelsStats() {
  const total = PLANNING_REGELS.length;
  const implemented = PLANNING_REGELS.filter((r) => r.status === "implemented").length;
  return { total, implemented, planned: total - implemented };
}
