/**
 * Planning (Uitvoering) blueprint — simple 3-state lifecycle, with
 * `Dienst` picklist driving which installation module(s) become relevant.
 * Bron: `data/zoho/Planningen.json` (actual_values).
 */

export const PLANNING_FASES = ["Nog niet gedaan", "In uitvoering", "Gereed"] as const;
export type PlanningFase = (typeof PLANNING_FASES)[number];

export const PLANNING_TRANSITIONS: Record<PlanningFase, PlanningFase[]> = {
  "Nog niet gedaan": ["In uitvoering"],
  "In uitvoering": ["Gereed"],
  Gereed: [],
};

export const PLANNING_DIENSTEN = [
  "Vloer verwijderen",
  "Muren verwijderen",
  "Droogbouw",
  "Ondergrond saneren",
  "Traprenovatie",
  "Vloer leggen",
  "Leggen vloer",
  "Vloerverwarming",
  "1e egalisatie",
  "2e egalisatie",
  "Opstookprotocol",
  "Opstookprotocol nwe vloerverwarming",
  "Opstookprotocol aanbouw",
  "Annulering legopdracht",
  "Annulering",
  "Preparatie",
  "Controle lijst legdienst",
  "Legdienst",
  "Sales controle",
  "2e Voorinspectie",
  "Voorinspectie",
  "Aanbouw",
  "Aanbouw vloerverwarming in bedrijf",
  "Aanbouw dekvloer storten",
  "Storting basisvloer nieuwbouw",
  "Basisvloer beoordeelbaar",
  "Activatie vloerverwarming",
  "Verhuizen",
  "Sleuteloverdracht",
  "Opleveren nieuwbouw",
] as const;
export type PlanningDienst = (typeof PLANNING_DIENSTEN)[number];

export const PLANNING_UITVOERDERS = [
  "Aannemer van Lab21",
  "Lab21",
  "Klant",
  "Leverancier",
  "3e partij",
] as const;
export type PlanningUitvoerder = (typeof PLANNING_UITVOERDERS)[number];

/**
 * Welke productconfigurator-module hoort bij deze dienst.
 * (Verwijderen, Voorbereiden, Droog_bouw, PXC, Verwarmen, Afwerken bevatten
 *  prijs-/rule-definities, niet executie-records.)
 */
export function dienstToConfiguratorModule(d: PlanningDienst): string | null {
  switch (d) {
    case "Vloer verwijderen":
    case "Muren verwijderen":
      return "Verwijderen";
    case "Preparatie":
    case "1e egalisatie":
    case "2e egalisatie":
    case "Ondergrond saneren":
    case "Aanbouw dekvloer storten":
    case "Storting basisvloer nieuwbouw":
    case "Basisvloer beoordeelbaar":
      return "Voorbereiden";
    case "Droogbouw":
      return "Droog_bouw";
    case "Vloer leggen":
    case "Leggen vloer":
    case "Traprenovatie":
      return "PXC";
    case "Vloerverwarming":
    case "Opstookprotocol":
    case "Opstookprotocol nwe vloerverwarming":
    case "Opstookprotocol aanbouw":
    case "Activatie vloerverwarming":
    case "Aanbouw vloerverwarming in bedrijf":
      return "Verwarmen";
    case "Aanbouw":
    case "Sleuteloverdracht":
    case "Opleveren nieuwbouw":
    case "Verhuizen":
    case "Legdienst":
    case "Controle lijst legdienst":
      return "Afwerken";
    case "Sales controle":
    case "2e Voorinspectie":
    case "Voorinspectie":
      return "Voorinspecties";
    case "Annulering legopdracht":
    case "Annulering":
      return null;
  }
}
