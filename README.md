# workflows

Code-based herbouw van de automatiseringen die nu in Zoho CRM (LAB21 BV) draaien.
Doel: workflow-regels, custom functions en process flows uit Zoho als TypeScript
code in deze repo zetten, getriggerd via webhooks of cron, deploybaar op Vercel.

## Stack

- TypeScript + Node 20+
- Zoho CRM v8 REST API (EU datacenter)
- Zod voor payload-validatie
- Per workflow één file in `src/workflows/`, geregistreerd in `registry.ts`
- Module metadata + blueprints onder source control in `data/zoho/`

## Aan de slag

```bash
npm install
cp .env.example .env   # vul Zoho OAuth credentials in
npm run typecheck
```

Eén workflow lokaal draaien:

```bash
npx tsx src/index.ts voorinspectie-akkoord '{"voorinspectieId":"123","status":"Akkoord klant VI"}'
```

Een Zoho-module verkennen (velden ophalen):

```bash
npx tsx src/scripts/probe.ts Voorinspecties
```

Metadata van alle (of specifieke) modules syncen:

```bash
npx tsx src/scripts/sync-metadata.ts            # alles
npx tsx src/scripts/sync-metadata.ts Voorinspecties Planningen
```

## Structuur

```
src/
  zoho/
    client.ts         REST-client + OAuth refresh
    records.ts        CRUD helpers
    modules.ts        Module-registry (api_name → label)
    blueprints/       Per module: states + transitions
  workflows/          Per regel één file (trigger + run)
  scripts/            sync-metadata, probe
data/
  zoho/               Versioned snapshot van module-metadata
docs/
  inventory.md            Modules + status overzicht
  voorinspectie-blueprint.md
  process-flows.md
```

## Wat er al gereconstrueerd is

| Onderdeel | Bron | Code |
|---|---|---|
| Voorinspectie blueprint (28 states) | data/zoho/Voorinspecties.json | src/zoho/blueprints/voorinspectie.ts |
| Planning blueprint (3 fases × 30 diensten) | data/zoho/Planningen.json | src/zoho/blueprints/planning.ts |
| Showroom blueprint (4 fases × 3 stages) | data/zoho/Showroom.json | src/zoho/blueprints/showroom.ts |
| Klantenservice taxonomieën | data/zoho/Klantenservice.json | src/zoho/blueprints/klantenservice.ts |
| Betalingen types | data/zoho/Betalingen.json | src/zoho/blueprints/betalingen.ts |
| 17 modules met velden + picklists | data/zoho/*.json | — |
| `voorinspectie-akkoord` workflow | — | src/workflows/voorinspectie-afgerond.ts |

## Wat NOG niet uit Zoho komt

De REST API geeft de volgende automation-types **niet** terug — die moeten
handmatig of via Setup → DataExport overgezet worden:

- Workflow Rules (de "als X dan Y" regels in Setup → Automation)
- Custom Functions (Deluge code in Function Studio)
- Approval Processes (route-definities)
- Blueprint **transitions** (de states zijn bekend, de edges niet)

Wat we wél hebben:
- Alle modules, velden, picklist-waarden (= blueprint states), lookups,
  formules, rollups, autonumber-prefixes
- Records data (via COQL of getRecords)
- Layouts + related lists
- Assignment rules: geen actieve in deze org

Zie [`docs/inventory.md`](docs/inventory.md) voor het volledige overzicht.
