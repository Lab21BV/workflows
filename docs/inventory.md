# Zoho CRM inventarisatie — LAB21 BV

Bron: live Zoho-organisatie `728921000000023712` (datacenter EU, Zoho One Enterprise).

## Modules

### Standaard CRM
Leads, Contacts, Accounts, Vendors, Deals, Products, Price_Books, Quotes,
Sales_Orders, Purchase_Orders, Invoices, Campaigns, Cases, Calls, Events,
Tasks, Solutions, Notes, Attachments, Activities, Projects.

### Custom — operations

| API name | Label | Fields | Bijzonderheden |
|---|---|---|---|
| [Voorinspecties](../data/zoho/Voorinspecties.json) | Voorinspecties | 57 | Blueprint 28 states. Autonum `VIN${dd}${MM}${yy}` |
| [Planningen](../data/zoho/Planningen.json) | Uitvoeringen | 62 | Blueprint 3 fases × 30 diensten. Autonum `UN${dd}${MM}${yy}` |
| [Locaties](../data/zoho/Locaties.json) | Locaties | 35 | Autonum `LOC-${MM}${yyyy}-` |
| [Ruimtes](../data/zoho/Ruimtes.json) | Ruimtes | 86 | Vloer-specs per kamer. Autonum `RUN${dd}${MM}${yy}` |
| [Showroom](../data/zoho/Showroom.json) | Afspraken | 27 | Blueprint 4 fases × 3 stages |
| [Stalen](../data/zoho/Stalen.json) | Uitlenen | 30 | Sample-uitleen aan Deals/Showroom |
| Stalen1 | Stalen | 18 | Sample catalogue (autonum `STAAL-`) |
| [Klantenservice](../data/zoho/Klantenservice.json) | Support | 43 | Klacht/Service. Autonum `SUP${dd}${MM}${yy}` |
| [Betalingen](../data/zoho/Betalingen.json) | Betalingen | 28 | Vooruit/Rest/Volledig via Pin/iDeal/Contant |
| [Reviews](../data/zoho/Reviews.json) | Feedback | 46 | 7 ster-ratings + 1-10 oordeel |
| [Communicaties](../data/zoho/Communicaties.json) | Communicaties | 13 | Email-log per contact. Autonum `COM-` |
| Vestigingen | Vestigingen | — | nog te syncen |
| Datums_2 | Tijdlijn | — | nog te syncen |
| Displays | Displays | — | nog te syncen |
| Postcodegegevens | Postcodegegevens | — | nog te syncen |
| Image_Logs | Image Logs | — | nog te syncen |
| Extra | Extra | — | nog te syncen |
| Kleuren | Kleuren | — | nog te syncen |
| Product_Supplier_Relation | — | — | nog te syncen |
| Supplier_X_Service | PXL | — | nog te syncen |

### Custom — product-configurators (geen execution records!)

Deze "installation pipeline" modules zijn niet de daadwerkelijke
uitvoeringsstappen — het zijn **prijs-/regel-definities** voor de Zoho
product-configurator. De échte uitvoering staat in Planningen.

| API name | Label | Fields | Inhoud |
|---|---|---|---|
| [Verwijderen](../data/zoho/Verwijderen.json) | Verwijderen | 27 | Verwijder-regels. Autonum `VERWIJDEREN-` |
| [Voorbereiden](../data/zoho/Voorbereiden.json) | Voorbereiden | 39 | Egalisatie/dekvloer regels. Autonum `VOORBEREIDEN-` |
| [Droog_bouw](../data/zoho/Droog_bouw.json) | Droogbouw | 27 | Droogbouw regels. Autonum `DROOGBOUW-` |
| [PXC](../data/zoho/PXC.json) | Installeren | 39 | Leg-regels per vloer/patroon/merk. Autonum `LEGGEN-` |
| [Verwarmen](../data/zoho/Verwarmen.json) | Verwarmen | 32 | Vloerverwarming-regels. Autonum `VERWARMEN-` |
| [Afwerken](../data/zoho/Afwerken.json) | Afwerken | 32 | Afwerk-regels. Autonum `AFWERKEN-` |

Veel ervan delen dezelfde "rule" picklists: `Configurator`, `Verplicht`,
`Berekening`, `Conditie_keuze_vervolg`, `Installatie_2_MS`. Dit ziet eruit als
een eigen geboude prijs-engine bovenop Zoho's CPQ.

### Kiosk Studio process flows

10 gepubliceerde/inactieve wizards — zie [docs/process-flows.md](process-flows.md).

## Automatiseringen

Zoho's REST API geeft **workflow rules, blueprints en custom functions niet
rechtstreeks terug**. Wel achterhaalbaar via metadata:

- **Blueprints** — gereconstrueerd uit picklist `Status`/`Fase`-velden.
  Modules met blueprint:
  - [Voorinspecties](../src/zoho/blueprints/voorinspectie.ts) — 28 states
  - [Planningen](../src/zoho/blueprints/planning.ts) — 3 fases × 30 diensten
  - [Showroom](../src/zoho/blueprints/showroom.ts) — 4 fases × 3 stages
  - [Klantenservice](../src/zoho/blueprints/klantenservice.ts) — types/oorzaken/oplossingen
  - [Betalingen](../src/zoho/blueprints/betalingen.ts) — type/kanaal
- **Assignment rules**: geen actieve regels (`getAssignmentRules` → leeg).
- **Variables**: geen org-wide variabelen geconfigureerd.
- **Workflow rules / Custom functions / Approval processes**: niet via API.
  Handmatig overzetten naar `src/workflows/` per regel.

## Vervolgstappen

1. `npx tsx src/scripts/sync-metadata.ts` om `data/zoho/<module>.json` voor
   de remaining modules te genereren.
2. Per blueprint een file in `src/zoho/blueprints/` met states + transitions
   (transitions zijn gokwerk tot iemand ze tegen Zoho Setup verifieert).
3. Per workflow-regel een file in `src/workflows/` + registratie in
   `registry.ts`.
4. Voor Deluge custom functions: kopieer uit Function Studio en herschrijf
   naar TypeScript.
