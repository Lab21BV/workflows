/**
 * Voortrajecten: end-to-end procesketens die uit meerdere stappen bestaan,
 * vaak met parallelle banen (klant ↔ aannemer). Bron: handmatig vastgelegd
 * door Victor; de meeste stappen zijn nog NIET als logica geïmplementeerd.
 *
 * Verschil met `processen.ts`: dat is één-op-één per workflow (één trigger,
 * één run). Dit is de procesvolgorde die meerdere workflows + handmatige
 * stappen + reminders aan elkaar knoopt.
 */

export type Lane = "hoofd" | "klant" | "aannemer";

export interface StapImplementatie {
  workflowId?: string;
  location?: string;
}

export interface VoortrajectStap {
  /** Volgnummer zoals "1", "7a", "8b". */
  nr: string;
  titel: string;
  details?: string;
  lane: Lane;
  status: "implemented" | "planned";
  implementatie?: StapImplementatie;
}

export interface Voortraject {
  id: string;
  titel: string;
  uitleg: string;
  stappen: VoortrajectStap[];
}

export const VOORTRAJECTEN: Voortraject[] = [
  {
    id: "voortraject-vloerverwarming",
    titel: "Voortraject vloerverwarming",
    uitleg:
      "Van aanbetaling tot toewijzing aannemer + bevestiging infreesdatum. Splits na stap 6 in een klantbaan (inmeetformulier + datum bevestigen) en een aannemerbaan (datum bevestigen + escalatie).",
    stappen: [
      {
        nr: "1",
        titel: "Aanbetaling klant verwerkt",
        details: "Drempel >25% van ordertotaal voor doorzetting naar salescontrole.",
        lane: "hoofd",
        status: "planned",
      },
      {
        nr: "2",
        titel: "Sales controle",
        details:
          "Order gaat naar fase 'Ordercheck' zodra opmerkingen (Description) zijn ingevuld; AM krijgt 'm in de lijst.",
        lane: "hoofd",
        status: "implemented",
        implementatie: {
          workflowId: "sales-order-naar-ordercheck",
          location: "src/workflows/sales-order-naar-ordercheck.ts",
        },
      },
      {
        nr: "3",
        titel: "Order goedgekeurd",
        details: "Auto-transitie Salescontrol uitgevoerd → Approved.",
        lane: "hoofd",
        status: "planned",
      },
      {
        nr: "4",
        titel: "Introductie accountmanager (LAB21-T35)",
        details:
          "Uit naam van de verkoper, alleen wanneer klant nog niet eerder geïntroduceerd is.",
        lane: "hoofd",
        status: "planned",
      },
      {
        nr: "5",
        titel: "Klant ontvangt inmeetformulier vloerverwarming",
        details:
          "Interactief webformulier op /inmeetformulier?orderId=<id>. Versturing van de link via mail is nog planned.",
        lane: "hoofd",
        status: "implemented",
        implementatie: {
          location: "app/inmeetformulier/page.tsx",
        },
      },
      {
        nr: "6",
        titel: "Aannemer toewijzen + datum infrezen vloerverwarming",
        details:
          "Datum infrezen = min(leverdatum − 4 dagen, egaliseerdatum − 2 dagen).",
        lane: "hoofd",
        status: "planned",
      },
      {
        nr: "7a",
        titel: "Klant vult inmeetformulier in",
        details:
          "Submit slaat data op in Postgres (inmeet_submissions) en pusht een samenvatting naar Zoho Datums_2 (Code=INMEET-VLOERVERWARMING), zichtbaar op /tijdlijn/[orderId]. Reminders elke 2 dagen zijn nog planned.",
        lane: "klant",
        status: "implemented",
        implementatie: {
          location: "app/inmeetformulier/actions.ts + src/repo/inmeet.ts",
        },
      },
      {
        nr: "7b",
        titel: "Klant bevestigt datum vloerverwarming-installatie",
        details: "Reminders totdat bevestigd.",
        lane: "klant",
        status: "planned",
      },
      {
        nr: "7c",
        titel: "Ingevuld inmeetformulier doorsturen naar toegewezen aannemer",
        lane: "klant",
        status: "planned",
      },
      {
        nr: "8a",
        titel: "Aannemer bevestigt datum",
        lane: "aannemer",
        status: "planned",
      },
      {
        nr: "8b",
        titel: "Anders: aktie / escalatie",
        details: "Wanneer aannemer datum niet bevestigt — opvolg-actie nog te definiëren.",
        lane: "aannemer",
        status: "planned",
      },
      {
        nr: "9",
        titel: "Survey klanttevredenheid tot nu toe",
        lane: "hoofd",
        status: "planned",
      },
    ],
  },
];

export function voortrajectStats(v: Voortraject) {
  const total = v.stappen.length;
  const implemented = v.stappen.filter((s) => s.status === "implemented").length;
  return { total, implemented };
}
