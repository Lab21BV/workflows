# workflows

Code-based herbouw van Zoho CRM automatiseringen voor LAB21 BV, plus een
tijdlijn-UI die per Sales_Order alle Datums_2 mijlpalen + gerelateerde
Voorinspectie / Planning / Klantenservice records toont.

Live: https://lab21-operations.vercel.app

## Stack

- Next.js 16 + React 19 (App Router)
- TypeScript, server components
- Zoho CRM v8 REST API (EU datacenter)
- Zod voor payload-validatie
- Vercel functions + cron jobs

## Aan de slag

```bash
npm install
cp .env.example .env   # vul Zoho OAuth credentials in
npm run typecheck
npm run dev            # next dev op http://localhost:3000
```

Eén workflow lokaal draaien:

```bash
npx tsx src/scripts/probe.ts Voorinspecties   # module inspecteren
npx tsx src/scripts/sync-metadata.ts          # metadata bijwerken
```

## Routes

| Route | Wat |
|---|---|
| `/` | Dashboard met workflows, modules en cron schedules |
| `/tijdlijn` | Zoek op Sales_Order ID |
| `/tijdlijn/[id]` | Tijdlijn-visualisatie van een specifieke Sales_Order |
| `POST /api/webhooks/zoho` | Zoho webhook receiver (HMAC-verified) |
| `GET /api/cron/showroom-review-followup` | Daily 08:00 UTC |
| `GET /api/cron/voorinspectie-no-response` | Daily 08:30 UTC |
| `GET /api/status` | JSON: registered workflows + module taxonomy + crons |

## Structuur

```
app/
  layout.tsx, globals.css       UI shell
  page.tsx                      Home dashboard
  tijdlijn/                     UI: zoeker + detail
  api/
    status/route.ts             Service-status JSON
    webhooks/zoho/route.ts      Zoho webhook router
    cron/*/route.ts             Cron handlers
src/
  zoho/
    client.ts                   REST-client + OAuth refresh
    records.ts                  CRUD helpers
    modules.ts                  Module-registry
    blueprints/                 Per module: states + transitions
  workflows/                    Per regel één file (trigger + run)
  scripts/                      sync-metadata, probe
data/zoho/                      Versioned snapshot van module-metadata
docs/                           inventory, blueprints, deployment
vercel.json                     Cron schedules
```

## Workflows

| ID | Trigger | Wat |
|---|---|---|
| `voorinspectie-akkoord` | webhook | Voorinspectie → Akkoord klant VI → Planning aanmaken |
| `voorinspectie-no-response` | cron | Voorinspecties >3 dagen op Wachten op bevestiging → Geen reactie + mijlpaal |
| `showroom-afspraak-geweest` | webhook | Showroom → Geweest → Datums_2 mijlpaal |
| `klantenservice-nieuw-toewijzen` | webhook | Nieuwe klacht → owner van Verkooporder + tijdlijn |

## Wat NOG niet uit Zoho komt

De REST API geeft de volgende automation-types **niet** terug:
- Workflow Rules (Setup → Automation)
- Custom Functions (Deluge code in Function Studio)
- Approval-route definities
- Blueprint **transitions** (de states zijn bekend, de edges niet)

Wat we wél hebben: alle modules, velden, picklist-waarden (= blueprint states),
lookups, formules, rollups, autonumber-prefixes, records, layouts.

Zie [`docs/inventory.md`](docs/inventory.md) en [`docs/deployment.md`](docs/deployment.md).
