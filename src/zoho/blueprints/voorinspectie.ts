/**
 * Voorinspectie blueprint — uit live Zoho-metadata van module `Voorinspecties`.
 * Bron: `data/zoho/Voorinspecties.json` (Status veld, actual_values).
 *
 * Let op: dit zijn de échte API-waarden — de Zoho UI toont vaak afwijkende
 * Nederlandse display-labels. Bij PUT/POST naar de API gebruik je deze.
 *
 * De transities zijn een eerste lezing van de naamgeving — verifieer ze in
 * Zoho Setup → Automation → Blueprints → Voorinspectie.
 */

export const VOORINSPECTIE_STATES = [
  "Start proces",
  "Datum opties voorstellen",
  "Wachten op bevestiging",
  "Datum afgesproken",
  "Geen reactie",
  "Accountmanager belt klant",
  "Legger toewijzen",
  "Bevestigen VI aan aannemer",
  "Wachten op legger",
  "Legger bevestigd",
  "Legger akkoord",
  "Legger afgewezen",
  "Legger belt klant",
  "Datum plannen",
  "Tussenfase Datum plannen",
  "Wachten op uitvoering",
  "VI uitgevoerd",
  "Wachten verzending Checklist",
  "VI 1ste check",
  "VI 2de check",
  "Extra kosten",
  "Geen extra kosten",
  "Meerprijs",
  "Akkoord klant VI",
  "Klant niet akkoord met VI",
  "Klant niet akkoord",
  "Order definitief",
  "Einde proces voorinspectie",
] as const;

export type VoorinspectieState = (typeof VOORINSPECTIE_STATES)[number];

/**
 * Inferred transition graph. Verify each edge against the Blueprint in Zoho.
 */
export const VOORINSPECTIE_TRANSITIONS: Record<VoorinspectieState, VoorinspectieState[]> = {
  "Start proces": ["Datum opties voorstellen", "Legger toewijzen"],
  "Datum opties voorstellen": ["Wachten op bevestiging"],
  "Wachten op bevestiging": ["Datum afgesproken", "Geen reactie"],
  "Geen reactie": ["Accountmanager belt klant"],
  "Accountmanager belt klant": ["Datum afgesproken", "Klant niet akkoord met VI"],
  "Datum afgesproken": ["Legger toewijzen"],
  "Legger toewijzen": ["Bevestigen VI aan aannemer"],
  "Bevestigen VI aan aannemer": ["Wachten op legger"],
  "Wachten op legger": ["Legger bevestigd", "Legger afgewezen", "Legger belt klant"],
  "Legger belt klant": ["Legger akkoord", "Legger afgewezen"],
  "Legger bevestigd": ["Legger akkoord"],
  "Legger akkoord": ["Datum plannen"],
  "Legger afgewezen": ["Tussenfase Datum plannen"],
  "Tussenfase Datum plannen": ["Datum opties voorstellen"],
  "Datum plannen": ["Wachten op uitvoering"],
  "Wachten op uitvoering": ["VI uitgevoerd"],
  "VI uitgevoerd": ["Wachten verzending Checklist"],
  "Wachten verzending Checklist": ["VI 1ste check"],
  "VI 1ste check": ["VI 2de check", "Extra kosten", "Geen extra kosten"],
  "VI 2de check": ["Extra kosten", "Geen extra kosten"],
  "Extra kosten": ["Meerprijs"],
  "Geen extra kosten": ["Akkoord klant VI"],
  Meerprijs: ["Akkoord klant VI", "Klant niet akkoord"],
  "Akkoord klant VI": ["Order definitief"],
  "Klant niet akkoord": ["Einde proces voorinspectie"],
  "Klant niet akkoord met VI": ["Einde proces voorinspectie"],
  "Order definitief": ["Einde proces voorinspectie"],
  "Einde proces voorinspectie": [],
};

export function canTransition(from: VoorinspectieState, to: VoorinspectieState): boolean {
  return VOORINSPECTIE_TRANSITIONS[from].includes(to);
}

export function isTerminal(state: VoorinspectieState): boolean {
  return VOORINSPECTIE_TRANSITIONS[state].length === 0;
}

export const VOORINSPECTIE_REACTIE = ["1e poging", "2e poging"] as const;
export type VoorinspectieReactie = (typeof VOORINSPECTIE_REACTIE)[number];
