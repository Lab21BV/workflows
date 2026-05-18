# workflows

Code-based herbouw van de automatiseringen die nu in Zoho CRM (LAB21 BV) draaien.
Doel: workflow-regels, custom functions en process flows uit Zoho als TypeScript
code in deze repo zetten, getriggerd via webhooks of cron, deploybaar op Vercel.

## Stack

- TypeScript + Node 20+
- Zoho CRM v8 REST API (EU datacenter)
- Zod voor payload-validatie
- Per workflow één file in `src/workflows/`, geregistreerd in `registry.ts`

## Aan de slag

```bash
npm install
cp .env.example .env   # vul Zoho OAuth credentials in
npm run typecheck
```

Eén workflow lokaal draaien:

```bash
npx tsx src/index.ts voorinspectie-afgerond '{"voorinspectieId":"123"}'
```

Een Zoho-module verkennen (velden ophalen):

```bash
npx tsx src/scripts/probe.ts Voorinspecties
```

## Structuur

```
src/
  zoho/         REST-client + module registry
  workflows/    Per workflow één file (trigger + run)
  scripts/      Tooling (probe, auth helpers)
docs/
  inventory.md  Wat er in Zoho staat
```

## Status

| Workflow | Status |
|---|---|
| voorinspectie-afgerond | scaffold, veldnamen moeten geverifieerd worden via `probe` |

Zie [`docs/inventory.md`](docs/inventory.md) voor het volledige overzicht van
modules en process flows in de Zoho-omgeving.
