/**
 * Cross-app dataflow-overzicht: welke LAB21-apps wisselen data uit met
 * deze workflows-orchestrator. Bron: handmatig vastgelegd op het moment
 * dat de flow wordt gebouwd.
 *
 * Niet hetzelfde als `processen.ts` (één-workflow-per-trigger) of
 * `voortrajecten.ts` (procesketens binnen één app). Dit gaat over de
 * lijnen tussen de Lab21BV/* repos.
 */

export type AppId =
  | "klantenportal"
  | "workflows"
  | "aannemerportal"
  | "zoho-crm"
  | "zoho-creator";

export const APP_LABELS: Record<AppId, string> = {
  klantenportal: "Klantenportal",
  workflows: "Workflows (deze app)",
  aannemerportal: "Aannemerportal",
  "zoho-crm": "Zoho CRM",
  "zoho-creator": "Zoho Creator",
};

export interface CrossAppHop {
  /** Korte beschrijving van de hop. */
  titel: string;
  van: AppId;
  naar: AppId;
  /** HTTP-endpoint of repo-actie. */
  endpoint?: string;
  /** Korte uitleg. */
  uitleg: string;
  status: "implemented" | "planned";
  /** File/path waar de logica leeft, indien implemented. */
  location?: string;
}

export interface CrossAppFlow {
  id: string;
  titel: string;
  uitleg: string;
  hops: CrossAppHop[];
}

export const CROSS_APP_FLOWS: CrossAppFlow[] = [
  {
    id: "inmeetformulier-vloerverwarming",
    titel: "Inmeetformulier vloerverwarming",
    uitleg:
      "Eind-tot-eind keten waarin de klant het formulier invult, de AM controleert en goedkeurt, en de aannemer de gegevens uitleest. Workflows is single source of truth voor submissions (Postgres) en pusht een samenvatting naar Zoho CRM Datums_2 voor zichtbaarheid op de order-tijdlijn.",
    hops: [
      {
        titel: "Klant ziet CTA in zijn order",
        van: "klantenportal",
        naar: "klantenportal",
        uitleg:
          "Dashboard van klantenportal toont een banner zodra Vloerverwarming_3 in de Sales_Order zit (niet leeg / 'nee' / 'geen').",
        status: "implemented",
        location: "klantenportal/src/app/(portal)/dashboard/page.tsx",
      },
      {
        titel: "Klant vult formulier in",
        van: "klantenportal",
        naar: "klantenportal",
        uitleg:
          "Tailwind-form met 7 secties (Algemeen, Vloer, Ruimtes, Verdeler, Verwarmingsbron, Foto's, Bevestiging) + conditionele velden + dynamische ruimtes 1-6.",
        status: "implemented",
        location:
          "klantenportal/src/app/(portal)/inmeetformulier/inmeet-form.tsx",
      },
      {
        titel: "Submit naar workflows",
        van: "klantenportal",
        naar: "workflows",
        endpoint: "POST /api/inmeetformulier/submit",
        uitleg:
          "Bearer-auth via INMEET_API_SECRET. Workflows valideert via zod, slaat op in inmeet_submissions (status=submitted) en pusht samenvatting naar Zoho Datums_2 (Code INMEET-VLOERVERWARMING).",
        status: "implemented",
        location: "workflows/app/api/inmeetformulier/submit/route.ts",
      },
      {
        titel: "AM controleert + keurt goed",
        van: "workflows",
        naar: "workflows",
        uitleg:
          "Sectie 'Inmeetformulieren — wachten op controle' op /todo/accountmanager. AM keurt goed (wijst aannemer toe + optionele notitie) of wijst af. Server actions schrijven naar Postgres.",
        status: "implemented",
        location: "workflows/app/todo/_InmeetControleLijst.tsx",
      },
      {
        titel: "Aannemer leest goedgekeurde formulieren",
        van: "aannemerportal",
        naar: "workflows",
        endpoint: "GET /api/inmeetformulier?aannemerId=<id>",
        uitleg:
          "Aannemerportal toont alle AM-goedgekeurde formulieren op /inmeetformulieren. Filtering per aannemer is API-side aanwezig; UI gebruikt 'm nog niet (wacht op stabiele Vendor-ID koppeling).",
        status: "implemented",
        location: "aannemerportal/app/inmeetformulieren/page.tsx",
      },
      {
        titel: "Mail-trigger voor klant",
        van: "workflows",
        naar: "klantenportal",
        uitleg:
          "Na order-goedkeuring stuurt workflows automatisch een mail met de inmeetformulier-link naar de klant. Implementatie volgt — voor nu is het formulier alleen bereikbaar via de portal-CTA.",
        status: "planned",
      },
      {
        titel: "Tijdlijn-zichtbaarheid in Zoho",
        van: "workflows",
        naar: "zoho-crm",
        endpoint: "Datums_2 create (Code=INMEET-VLOERVERWARMING)",
        uitleg:
          "Bij elke submit wordt een Datums_2-mijlpaal aangemaakt gelinkt aan de Sales_Order, zodat het formulier op de order-tijdlijn verschijnt — zowel in Zoho CRM zelf als op workflows /tijdlijn/[orderId].",
        status: "implemented",
        location: "workflows/src/repo/inmeet.ts",
      },
    ],
  },
];

export function crossAppFlowStats(f: CrossAppFlow) {
  const total = f.hops.length;
  const implemented = f.hops.filter((h) => h.status === "implemented").length;
  return { total, implemented };
}
