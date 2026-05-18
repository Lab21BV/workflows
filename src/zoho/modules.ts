/**
 * LAB21 BV Zoho CRM module registry.
 * Source of truth for API names → human labels, kept in sync with Zoho.
 * Regenerate with `pnpm zoho:probe` (writes back to this file).
 */

export type ModuleKey = keyof typeof MODULES;

export const MODULES = {
  // Default CRM
  Leads: { label: "Leads", kind: "default" },
  Contacts: { label: "Contacts", kind: "default" },
  Accounts: { label: "Accounts", kind: "default" },
  Vendors: { label: "Vendors", kind: "default" },
  Deals: { label: "Deals", kind: "default" },
  Products: { label: "Products", kind: "default" },
  Price_Books: { label: "PriceBooks", kind: "default" },
  Quotes: { label: "Quotes", kind: "default" },
  Sales_Orders: { label: "SalesOrders", kind: "default" },
  Purchase_Orders: { label: "PurchaseOrders", kind: "default" },
  Invoices: { label: "Invoices", kind: "default" },
  Campaigns: { label: "Campaigns", kind: "default" },
  Cases: { label: "Cases", kind: "default" },
  Calls: { label: "Calls", kind: "default" },
  Events: { label: "Meetings", kind: "default" },
  Tasks: { label: "Tasks", kind: "default" },
  Solutions: { label: "Solutions", kind: "default" },
  Notes: { label: "Notes", kind: "default" },
  Attachments: { label: "Attachments", kind: "default" },
  Activities: { label: "Activities", kind: "default" },
  Projects: { label: "Projects", kind: "default" },

  // Custom — LAB21 operations
  Planningen: { label: "Uitvoeringen", kind: "custom" },
  Voorinspecties: { label: "Voorinspecties", kind: "custom" },
  Locaties: { label: "Locaties", kind: "custom" },
  Ruimtes: { label: "Ruimtes", kind: "custom" },
  Vestigingen: { label: "Vestigingen", kind: "custom" },
  Datums_2: { label: "Tijdlijn", kind: "custom" },
  Displays: { label: "Displays", kind: "custom" },
  Klantenservice: { label: "Support", kind: "custom" },
  Showroom: { label: "Afspraken", kind: "custom" },
  Stalen: { label: "Uitlenen", kind: "custom" },
  Stalen1: { label: "Stalen", kind: "custom" },
  Postcodegegevens: { label: "Postcodegegevens", kind: "custom" },
  Betalingen: { label: "Betalingen", kind: "custom" },
  Reviews: { label: "Feedback", kind: "custom" },
  Communicaties: { label: "Communicaties", kind: "custom" },
  Extra: { label: "Extra", kind: "custom" },
  Kleuren: { label: "Kleuren", kind: "custom" },
  Image_Logs: { label: "Image Logs", kind: "custom" },
  Product_Supplier_Relation: { label: "Product Supplier Relation", kind: "custom" },
  Supplier_X_Service: { label: "PXL", kind: "custom" },

  // Custom — installation stages (production line)
  Verwijderen: { label: "Verwijderen", kind: "custom" },
  Voorbereiden: { label: "Voorbereiden", kind: "custom" },
  Droog_bouw: { label: "Droogbouw", kind: "custom" },
  PXC: { label: "Installeren", kind: "custom" },
  Verwarmen: { label: "Verwarmen", kind: "custom" },
  Afwerken: { label: "Afwerken", kind: "custom" },

  // Kiosk Studio process flows (guided forms)
  Profielvragen: { label: "Profielvragen", kind: "process_flow" },
  Profielvragen2: { label: "Profielvragen v2", kind: "process_flow" },
  Offerte_gegevens: { label: "Offerte gegevens", kind: "process_flow" },
  Offerte_gegevens1: { label: "Offerte gegevens (legacy)", kind: "process_flow" },
  Order_gegevens: { label: "Verkooporder gegevens", kind: "process_flow" },
  Nieuwe_order: { label: "Verkooporder gegevens (legacy)", kind: "process_flow" },
  Afpraak_vanuit_staal1: { label: "Afspraak vanuit staal (legacy)", kind: "process_flow" },
  Afpraak_vanuit_staal2: { label: "Afspraak vanuit staal", kind: "process_flow" },
  Verkoopkans_gegevens1: { label: "Verkoopkans gegevens (legacy)", kind: "process_flow" },
  Verkoopkans_gegevens2: { label: "Verkoopkans gegevens", kind: "process_flow" },
} as const satisfies Record<string, { label: string; kind: "default" | "custom" | "process_flow" }>;

export const INSTALLATION_PIPELINE: ModuleKey[] = [
  "Voorinspecties",
  "Planningen",
  "Verwijderen",
  "Voorbereiden",
  "Droog_bouw",
  "PXC",
  "Verwarmen",
  "Afwerken",
];
