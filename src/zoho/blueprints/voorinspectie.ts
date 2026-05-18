/**
 * Voorinspectie blueprint — afgeleid van de Status (Fase) picklist op
 * module `Voorinspecties` (28 states). De transities hier zijn een eerste
 * lezing van de naamgeving — verifieer/correct ze tegen de daadwerkelijke
 * Zoho Blueprint definitie in Setup → Automation → Blueprints.
 */

export const VOORINSPECTIE_STATES = [
  "Aangemaakt",
  "Start proces",
  "Datum opties voorstellen",
  "Wachten op bevestiging",
  "Opnieuw wachten op bevestigen",
  "Datum afgesproken",
  "Bevestigen aan aannemer",
  "Wachten op legger",
  "Legger akkoord",
  "Afwijzing legger",
  "Legger Belt Relatie",
  "Accountmanager Belt Relatie",
  "Gepland",
  "Tussenfase Datum plannen",
  "Uitgevoerd",
  "Wachten verzending Checklist",
  "1ste check",
  "2de check",
  "Gecheckt",
  "Klant niet akkoord met VI",
  "Relatie niet akkoord",
  "Meerprijs",
  "Extra kosten",
  "Geen extra kosten",
  "Akkoord",
  "Bevestiging legger",
  "Order definitief",
  "Einde proces voorinspectie",
] as const;

export type VoorinspectieState = (typeof VOORINSPECTIE_STATES)[number];

export const VOORINSPECTIE_REACTIE = ["1e poging", "2e poging"] as const;
export type VoorinspectieReactie = (typeof VOORINSPECTIE_REACTIE)[number];

/**
 * Edges of the blueprint. The Zoho rest API does not expose blueprint
 * transitions — these are the most plausible flow inferred from labels.
 * Verify each entry against Setup → Blueprints → Voorinspectie.
 */
export const VOORINSPECTIE_TRANSITIONS: Record<VoorinspectieState, VoorinspectieState[]> = {
  Aangemaakt: ["Start proces"],
  "Start proces": ["Datum opties voorstellen"],
  "Datum opties voorstellen": ["Wachten op bevestiging"],
  "Wachten op bevestiging": [
    "Datum afgesproken",
    "Opnieuw wachten op bevestigen",
    "Accountmanager Belt Relatie",
  ],
  "Opnieuw wachten op bevestigen": ["Datum afgesproken", "Accountmanager Belt Relatie"],
  "Accountmanager Belt Relatie": ["Datum opties voorstellen", "Klant niet akkoord met VI"],
  "Datum afgesproken": ["Bevestigen aan aannemer"],
  "Bevestigen aan aannemer": ["Wachten op legger"],
  "Wachten op legger": ["Legger akkoord", "Afwijzing legger", "Legger Belt Relatie"],
  "Legger Belt Relatie": ["Legger akkoord", "Afwijzing legger"],
  "Legger akkoord": ["Gepland"],
  "Afwijzing legger": ["Tussenfase Datum plannen"],
  "Tussenfase Datum plannen": ["Datum opties voorstellen"],
  Gepland: ["Uitgevoerd"],
  Uitgevoerd: ["Wachten verzending Checklist"],
  "Wachten verzending Checklist": ["1ste check"],
  "1ste check": ["2de check", "Gecheckt"],
  "2de check": ["Gecheckt"],
  Gecheckt: ["Extra kosten", "Geen extra kosten"],
  "Extra kosten": ["Meerprijs"],
  "Geen extra kosten": ["Akkoord"],
  Meerprijs: ["Akkoord", "Relatie niet akkoord"],
  "Relatie niet akkoord": ["Einde proces voorinspectie"],
  "Klant niet akkoord met VI": ["Einde proces voorinspectie"],
  Akkoord: ["Bevestiging legger"],
  "Bevestiging legger": ["Order definitief"],
  "Order definitief": ["Einde proces voorinspectie"],
  "Einde proces voorinspectie": [],
};

export function canTransition(from: VoorinspectieState, to: VoorinspectieState): boolean {
  return VOORINSPECTIE_TRANSITIONS[from].includes(to);
}

export function isTerminal(state: VoorinspectieState): boolean {
  return VOORINSPECTIE_TRANSITIONS[state].length === 0;
}
