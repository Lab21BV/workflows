/**
 * Sales_Orders blueprint — Fase (Status) picklist + sequence.
 *
 * Bron: `data/zoho/order-status.csv` (kolom "API actual").
 *
 * Display labels en sequence-nummers staan ook in
 * `src/data/order-status-controlelijst.ts` — als beide moeten wijzigen,
 * pas dit bestand én die file aan.
 */

export const SALES_ORDER_STATES = [
  "Created",
  "Wacht op aanbetaling",
  "Aanbetaling ontvangen",
  "Approved",
  "Gereserveerd",
  "Order verwerken",
  "Ordercheck",
  "Salescontrol uitgevoerd",
  "Perform timecontrol",
  "Timecontrol completed",
  "Vrijgegeven voor levering",
  "Delivered",
  "Cancelled",
  "Verzamellijst afgedrukt",
  "Vrijgegeven voor verzamellijst",
  "Verzamellijst verwerkt",
  "Vrijgegeven voor facturering",
  "VI akkoord",
  "VI gepland",
  "VI uitgevoerd",
] as const;

export type SalesOrderState = (typeof SALES_ORDER_STATES)[number];

export const ORDERCHECK_STATE: SalesOrderState = "Ordercheck";

const SEQUENCE = new Map<string, number>(
  SALES_ORDER_STATES.map((s, i) => [s, i + 1]),
);

/**
 * True wanneer de fase strikt vóór "Ordercheck" zit. Statussen die later in
 * de pipeline zitten (Salescontrol uitgevoerd, Vrijgegeven voor levering,
 * Delivered, ...) geven false zodat we de fase niet terugdraaien.
 * Onbekende fases → false (skip; veiligheidsgrendel).
 */
export function isBeforeOrdercheck(state: string | null | undefined): boolean {
  if (!state) return false;
  const seq = SEQUENCE.get(state);
  if (seq == null) return false;
  const ordercheckSeq = SEQUENCE.get(ORDERCHECK_STATE)!;
  return seq < ordercheckSeq;
}
