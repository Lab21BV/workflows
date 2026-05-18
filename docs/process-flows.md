# Kiosk Studio process flows

LAB21 heeft 10 Zoho Kiosk Studio "process flows" — gepubliceerde formulieren
die als wizard worden aangeboden bij specifieke modules. Elk flow bewaart de
ingevulde antwoorden als records in een eigen module met de naam `ProcessFlowN`.

## Verbindingspatroon

Elk process flow record bevat:
- `Kiosk_Start_Time` / `Kiosk_end_time` — wanneer de wizard begon/eindigde
- `CurrentRecord` — lookup naar het parent-record (Sales_Order, Quote, Deal, …)
- Specifieke vragen per flow

Het parent-record blijft de bron-of-truth; het flow-record is de wizard-state.

## Overzicht

| Flow API name | Status | Parent module | Doel |
|---|---|---|---|
| [`Profielvragen`](../data/zoho/Profielvragen.json) | Published | ? | Klantprofiel vragenlijst |
| `Profielvragen2` | onbekend | ? | v2 |
| [`Offerte_gegevens`](../data/zoho/Offerte_gegevens.json) | Published | Quotes | Opvolging offerte (telefonisch/showroom) |
| `Offerte_gegevens1` | Inactive | Quotes | Legacy |
| [`Order_gegevens`](../data/zoho/Order_gegevens.json) | Published | Sales_Orders | Bouwspec (soort bebouwing, aanbouw, muur, basisvloer) |
| `Nieuwe_order` | Inactive | Sales_Orders | Legacy |
| `Afpraak_vanuit_staal2` | Published | Stalen | Afspraak n.a.v. uitgeleend staal |
| `Afpraak_vanuit_staal1` | Inactive | Stalen | Legacy |
| `Verkoopkans_gegevens2` | Published | Deals | Verkoopkans-specs |
| `Verkoopkans_gegevens1` | onbekend | Deals | Legacy |

## Order_gegevens — bouwspec wizard

Gehangen aan `Sales_Orders`. Vraagt naar:
- **Soort bebouwing** (29 opties: 2-onder-1-kap-woning, Appartement, Bungalow,
  Hoekwoning, Maisonnette, Studio, Vrijstaande woning, …)
- **Aanbouw** (Ja/Nee)
- **Muur verwijderen** (Ja/Nee)
- **Constructie** (Optie 1/2 — placeholders)
- **Type basisvloer** (vrij tekstveld)

## Offerte_gegevens — offerte-opvolging

Gehangen aan `Quotes`. Vraagt naar:
- **Opvolging offerte** (telefonisch / showroom)
- **Datum/Tijd opvolging**

## Nabouwen in code

Deze flows zijn in feite **typed forms**. Nabouwen kan op twee manieren:

1. **Vervangen door eigen UI** (Next.js/React form) → schrijft direct naar het
   parent-record via Zoho REST API. Geen ProcessFlow-record meer nodig.
2. **Behouden + interceptable** (webhook na Kiosk_end_time) → eigen workflow
   leest de antwoorden en doet vervolg-acties (planning aanmaken, mail sturen).

Aanrader: optie 1 voor nieuw werk, optie 2 als we de bestaande wizards in Zoho
willen laten staan.
