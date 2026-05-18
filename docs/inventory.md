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

Zoho's REST API geeft **workflow rules, blueprints en custom functions niet
rechtstreeks terug**. Wel achterhaalbaar via metadata:

- **Blueprints** — alle modules met `isBlueprintSupported: true` hebben een
  staten-machine waarvan de states als picklist op het `Status` (of vergelijkbaar)
  veld staan. We reconstrueren de transitions handmatig — zie bv.
  [`docs/voorinspectie-blueprint.md`](voorinspectie-blueprint.md).
- **Assignment rules**: geen actieve regels (`getAssignmentRules` → leeg).
- **Variables**: geen org-wide variabelen geconfigureerd.
- **Custom functions / workflow rules / approval processes**: niet via API.
  Te exporteren via Zoho Setup → DataExport → Configuration data, of
  handmatig overschrijven naar `src/workflows/` per regel.

## Vervolgstappen

1. `npx tsx src/scripts/sync-metadata.ts` om `data/zoho/<module>.json` te
   genereren (vereist `.env` met OAuth-credentials).
2. Per blueprint een file in `src/zoho/blueprints/` met states + transitions.
3. Per workflow-regel een file in `src/workflows/` + registratie in
   `registry.ts`. Trigger-bron: Zoho webhook → Vercel function, of cron.
4. Voor Deluge custom functions: kopieer de logica handmatig uit Function
   Studio en herschrijf naar TypeScript.
