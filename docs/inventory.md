# Zoho CRM inventarisatie — LAB21 BV

Bron: live Zoho-organisatie `728921000000023712` (datacenter EU, Zoho One Enterprise).

## Modules

### Standaard CRM
Leads, Contacts, Accounts, Vendors, Deals, Products, Price_Books, Quotes,
Sales_Orders, Purchase_Orders, Invoices, Campaigns, Cases, Calls, Events,
Tasks, Solutions, Notes, Attachments, Activities, Projects.

### Custom — operations
| API name | Label |
|---|---|
| Planningen | Uitvoeringen |
| Voorinspecties | Voorinspecties |
| Locaties | Locaties |
| Ruimtes | Ruimtes |
| Vestigingen | Vestigingen |
| Datums_2 | Tijdlijn |
| Displays | Displays |
| Klantenservice | Support |
| Showroom | Afspraken |
| Stalen | Uitlenen |
| Stalen1 | Stalen |
| Postcodegegevens | Postcodegegevens |
| Betalingen | Betalingen |
| Reviews | Feedback |
| Communicaties | Communicaties |
| Extra | Extra |
| Kleuren | Kleuren |
| Image_Logs | Image Logs |
| Product_Supplier_Relation | Product Supplier Relation |
| Supplier_X_Service | PXL |

### Custom — installatiepipeline
`Voorinspecties` → `Planningen` → `Verwijderen` → `Voorbereiden` → `Droog_bouw`
→ `PXC` (Installeren) → `Verwarmen` → `Afwerken`.

### Kiosk Studio process flows
| API name | Status | Doel |
|---|---|---|
| Profielvragen | Published | klant profielvragen |
| Profielvragen2 | onbekend | v2 variant |
| Offerte_gegevens | Published | offerte-data invoer |
| Offerte_gegevens1 | Inactive | legacy |
| Order_gegevens | Published | verkooporder-data |
| Nieuwe_order | Inactive | legacy |
| Afpraak_vanuit_staal2 | Published | afspraak na staal |
| Afpraak_vanuit_staal1 | Inactive | legacy |
| Verkoopkans_gegevens2 | Published | deal-data invoer |
| Verkoopkans_gegevens1 | onbekend | legacy |

## Automatiseringen

- **Assignment rules**: geen actieve regels gevonden via API.
- **Workflow rules**: niet via REST API exposed door Zoho — moeten handmatig
  geïnventariseerd worden of via Setup → Automation → Workflow Rules.
- **Blueprints / Approval processes / Custom functions**: nog te inventariseren.

## Vervolgstappen

1. Per module velden ophalen met `pnpm zoho:probe <Module>` en types vastleggen.
2. Per Zoho workflow-regel die we willen vervangen: een entry in
   `src/workflows/` + registratie in `registry.ts`.
3. Trigger-bron kiezen: Zoho webhook → Vercel function, of pollende cron.
