/**
 * Controlelijst per Sales_Orders.Status (Fase) — eerste-versie.
 *
 * Volgorde + display-namen exact uit de Zoho picklist (20 fasen).
 * Per fase een lijst checks gesplitst per rol. Pas vrij aan en commit
 * opnieuw — de pagina's `/todo/accountmanager` en `/todo/inkoop-planning`
 * lezen direct uit deze file.
 */

export type ControleRol = "accountmanager" | "inkoop_planning";

export interface ControleItem {
  rol: ControleRol;
  /** Wat de rol moet controleren / doen in deze fase. */
  check: string;
  /** Optioneel: link naar gerelateerde Zoho-action of doc. */
  link?: string;
}

export interface ControleFase {
  sequence: number;
  display: string;
  /** Actual value uit de Zoho picklist — voor API-queries. */
  actual: string;
  items: ControleItem[];
}

/**
 * NB: dit is een eerste schatting op basis van de fasenamen — verfijn dit
 * door de échte operationele controlelijst in deze file te zetten.
 */
export const ORDER_STATUS_CONTROLELIJST: ControleFase[] = [
  {
    sequence: 1,
    display: "Aangemaakt",
    actual: "Created",
    items: [
      { rol: "accountmanager", check: "Order-gegevens compleet (klant, adres, contactpersoon)" },
      { rol: "accountmanager", check: "Producten + aantallen kloppen met offerte" },
      { rol: "inkoop_planning", check: "Ordertype + magazijn correct ingevuld" },
    ],
  },
  {
    sequence: 2,
    display: "Wacht op aanbetaling",
    actual: "Wacht op aanbetaling",
    items: [
      { rol: "accountmanager", check: "Aanbetalingslink verstuurd aan klant" },
      { rol: "accountmanager", check: "Herinnering inplannen na 3 dagen geen reactie" },
    ],
  },
  {
    sequence: 3,
    display: "Aanbetaling ontvangen",
    actual: "Aanbetaling ontvangen",
    items: [
      { rol: "accountmanager", check: "Bevestigingsmail verstuurd aan klant" },
    ],
  },
  {
    sequence: 4,
    display: "Goedgekeurd",
    actual: "Approved",
    items: [
      { rol: "inkoop_planning", check: "Voorraad-check uitvoeren voor alle line items" },
      { rol: "inkoop_planning", check: "Inkooporder klaarzetten voor non-voorraad-items" },
    ],
  },
  {
    sequence: 5,
    display: "Gereserveerd",
    actual: "Gereserveerd",
    items: [
      { rol: "inkoop_planning", check: "Voorraad daadwerkelijk gereserveerd in King" },
      { rol: "accountmanager", check: "Voorinspectie inplannen indien van toepassing" },
    ],
  },
  {
    sequence: 6,
    display: "Leverancier toewijzen",
    actual: "Order verwerken",
    items: [
      { rol: "inkoop_planning", check: "Aannemer / leverancier gekoppeld aan order" },
      { rol: "inkoop_planning", check: "Bestelbon klaar voor uitvoering" },
    ],
  },
  {
    sequence: 7,
    display: "Salescontrol uitvoeren",
    actual: "Ordercheck",
    items: [
      { rol: "accountmanager", check: "Order-details verifiëren (prijs, korting, scope)" },
      { rol: "accountmanager", check: "Bijzonderheden klant opnemen in order" },
      { rol: "accountmanager", check: "Eventuele meerprijzen goedgekeurd" },
    ],
  },
  {
    sequence: 8,
    display: "Salescontrol uitgevoerd",
    actual: "Salescontrol uitgevoerd",
    items: [
      { rol: "accountmanager", check: "Order vrijgeven voor tijdlijn-controle" },
    ],
  },
  {
    sequence: 9,
    display: "Tijdlijn controle uitvoeren",
    actual: "Perform timecontrol",
    items: [
      { rol: "inkoop_planning", check: "Leverdatum vs. levertijd producten verifiëren" },
      { rol: "inkoop_planning", check: "Vloerverwarming / droogperiode / acclimatisatie inplannen" },
      { rol: "inkoop_planning", check: "Kritieke mijlpalen op tijdlijn checken" },
    ],
  },
  {
    sequence: 10,
    display: "Tijdlijn controle uitgevoerd",
    actual: "Timecontrol completed",
    items: [
      { rol: "inkoop_planning", check: "Definitieve leverdatum vastgesteld + gecommuniceerd" },
    ],
  },
  {
    sequence: 11,
    display: "Vrijgegeven voor levering",
    actual: "Vrijgegeven voor levering",
    items: [
      { rol: "inkoop_planning", check: "Levermoment afstemmen met aannemer" },
      { rol: "inkoop_planning", check: "Klant informeren over leverdatum" },
    ],
  },
  {
    sequence: 12,
    display: "Afgeleverd",
    actual: "Delivered",
    items: [
      { rol: "accountmanager", check: "Opleverbevestiging klant gevraagd" },
      { rol: "inkoop_planning", check: "Factuur klaarzetten in King" },
    ],
  },
  {
    sequence: 13,
    display: "Geannuleerd",
    actual: "Cancelled",
    items: [
      { rol: "accountmanager", check: "Reden van annulering registreren" },
      { rol: "accountmanager", check: "Aanbetaling terugstorten indien van toepassing" },
      { rol: "inkoop_planning", check: "Voorraad vrijgeven in King" },
    ],
  },
  {
    sequence: 14,
    display: "Verzamellijst afgedrukt",
    actual: "Verzamellijst afgedrukt",
    items: [
      { rol: "inkoop_planning", check: "Magazijn-medewerker geïnformeerd" },
    ],
  },
  {
    sequence: 15,
    display: "Vrijgegeven voor verzamellijst",
    actual: "Vrijgegeven voor verzamellijst",
    items: [
      { rol: "inkoop_planning", check: "Verzamellijst-aanvraag bij magazijn" },
    ],
  },
  {
    sequence: 16,
    display: "Verzamellijst verwerkt",
    actual: "Verzamellijst verwerkt",
    items: [
      { rol: "inkoop_planning", check: "Alle items aanwezig en gescand" },
      { rol: "inkoop_planning", check: "Verschillen / tekorten gerapporteerd" },
    ],
  },
  {
    sequence: 17,
    display: "Vrijgegeven voor facturering",
    actual: "Vrijgegeven voor facturering",
    items: [
      { rol: "accountmanager", check: "Factuur verstuurd aan klant" },
      { rol: "inkoop_planning", check: "Voltooiing in King geboekt" },
    ],
  },
  {
    sequence: 18,
    display: "VI akkoord",
    actual: "VI akkoord",
    items: [
      { rol: "accountmanager", check: "Klant bevestiging VI ontvangen" },
      { rol: "inkoop_planning", check: "Planning record kan starten" },
    ],
  },
  {
    sequence: 19,
    display: "VI gepland",
    actual: "VI gepland",
    items: [
      { rol: "accountmanager", check: "Klant geïnformeerd over VI-datum + tijdblok" },
      { rol: "inkoop_planning", check: "Aannemer toegewezen + bevestigd" },
    ],
  },
  {
    sequence: 20,
    display: "VI uitgevoerd",
    actual: "VI uitgevoerd",
    items: [
      { rol: "accountmanager", check: "Bevindingen + meerprijs doorzetten aan klant" },
      { rol: "inkoop_planning", check: "Definitieve order-aanpassingen verwerken" },
    ],
  },
];

export function controlelijstVoor(rol: ControleRol): ControleFase[] {
  return ORDER_STATUS_CONTROLELIJST
    .map((fase) => ({ ...fase, items: fase.items.filter((i) => i.rol === rol) }))
    .filter((fase) => fase.items.length > 0);
}
