/**
 * Planning (Uitvoering) blueprint — simple 3-state lifecycle, with
 * `Dienst` picklist driving which installation module(s) become relevant.
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
  "Droogbouw",
  "Ondergrond saneren",
  "Traprenovatie",
  "Vloer leggen",
  "Vloerverwarming",
  "1e egalisatie",
  "2e egalisatie",
  "Opstookprotocol",
  "Opstookprotocol nwe vloerverwarming",
  "Annulering legopdracht",
  "Annulering order",
  "Preparatie",
  "Controlelijst",
  "Legdienst",
  "Sales controle",
  "2e Voorinspectie",
  "Leggen vloer",
  "Opstookprotocol aanbouw",
  "Aanbouw",
  "Aanbouw vloerverwarming in bedrijf",
  "Storting basisvloer nieuwbouw",
  "Activatie vloerverwarming",
  "Verhuizen",
  "Muren verwijderen",
  "Sleuteloverdracht",
  "Opleveren nieuwbouw",
  "Dekvloer storten",
  "Basisvloer beoordeelbaar",
  "Voorinspectie",
] as const;
export type PlanningDienst = (typeof PLANNING_DIENSTEN)[number];

export const PLANNING_UITVOERDERS = [
  "Aannemer van Lab21",
  "Lab21",
  "Relatie",
  "Leverancier",
  "3e partij",
] as const;
export type PlanningUitvoerder = (typeof PLANNING_UITVOERDERS)[number];

/**
 * Maps a `Dienst` value to the installation-stage module that downstream
 * records get written to. Returns `null` for diensten that are admin-only
 * (e.g. Sales controle, Annulering ...) and do not produce an execution
 * record in a stage module.
 */
export function dienstToStageModule(d: PlanningDienst): string | null {
  switch (d) {
    case "Vloer verwijderen":
    case "Muren verwijderen":
      return "Verwijderen";
    case "Preparatie":
    case "1e egalisatie":
    case "2e egalisatie":
    case "Ondergrond saneren":
    case "Dekvloer storten":
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
    case "Controlelijst":
    case "Sales controle":
    case "2e Voorinspectie":
    case "Voorinspectie":
      return "Voorinspecties";
    case "Aanbouw":
    case "Sleuteloverdracht":
    case "Opleveren nieuwbouw":
    case "Verhuizen":
    case "Legdienst":
      return "Afwerken";
    case "Annulering legopdracht":
    case "Annulering order":
      return null;
  }
}
