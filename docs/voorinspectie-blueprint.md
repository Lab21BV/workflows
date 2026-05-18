# Voorinspectie blueprint

Bron: live Zoho-org LAB21 BV, module `Voorinspecties` (`isBlueprintSupported: true`,
last modified 2026-04-12). Volledige veldlijst staat in
[`data/zoho/Voorinspecties.json`](../data/zoho/Voorinspecties.json).

## States (Status / "Fase")

28 states in totaal — afgeleid van de `Status` picklist. De Zoho REST API geeft
de echte transitions niet terug; onderstaande edges zijn een eerste lezing van
de naamgeving in [`src/zoho/blueprints/voorinspectie.ts`](../src/zoho/blueprints/voorinspectie.ts).
Verifieer ze tegen Setup → Automation → Blueprints → Voorinspectie.

```
Aangemaakt
   └─> Start proces
          └─> Datum opties voorstellen ◀────────────────┐
                 └─> Wachten op bevestiging              │
                        ├─> Datum afgesproken            │
                        ├─> Opnieuw wachten op bevestigen│
                        │      └─> Datum afgesproken     │
                        └─> Accountmanager Belt Relatie ─┤
                                ├─> (terug naar voorstellen)
                                └─> Klant niet akkoord met VI
                                       └─> Einde proces

Datum afgesproken
   └─> Bevestigen aan aannemer
          └─> Wachten op legger
                 ├─> Legger Belt Relatie
                 ├─> Legger akkoord ─> Gepland ─> Uitgevoerd
                 └─> Afwijzing legger ─> Tussenfase Datum plannen ─┘

Uitgevoerd
   └─> Wachten verzending Checklist
          └─> 1ste check
                 ├─> 2de check ─> Gecheckt
                 └─> Gecheckt
                        ├─> Extra kosten ─> Meerprijs
                        │                       ├─> Akkoord
                        │                       └─> Relatie niet akkoord ─> Einde proces
                        └─> Geen extra kosten ─> Akkoord ─> Bevestiging legger ─> Order definitief ─> Einde proces
```

## Belangrijke velden

| Veld | Type | Doel |
|---|---|---|
| `Status` | picklist (28) | Blueprint-fase |
| `Reactie_fase` | picklist | 1e / 2e poging contact |
| `Voorstel_datum_tijd_1..3` + `Geaccepteerd_1..3` | datetime+bool | 3 voorstellen mechanisme |
| `Aannemer` | lookup → Vendors | Toegewezen legger |
| `Accountmanager` | userlookup | Interne accountmanager |
| `Verkooporders` | lookup → Sales_Orders | Bovenliggende order |
| `Ruimtes` | multiselectlookup → Ruimtes | Te leggen ruimtes |
| `Aantal_ruimtes` | rollup_summary | Aantal uit related list |
| `Week_voor_geplande_leverdatum` | formula | Wekenberekening |
| `Plan_voor_hoge_plinten` | picklist | Plint-strategie keuze |

## Vermoedelijke gekoppelde automatiseringen

Door alleen naar de veldstructuur te kijken kunnen we niet 100% zien welke
Deluge / workflow-regels Zoho draait. Wat we wél met zekerheid kunnen zeggen:

- **Voorstel-cyclus** — er zijn 3 voorstel-velden met aparte accept-vlaggen;
  hoogstwaarschijnlijk stuurt een workflow-regel mails/herinneringen na N dagen
  per voorstel zonder reactie.
- **Akkoord → Planning** — `Status = Akkoord` of `Status = Order definitief`
  triggert het aanmaken van een `Planningen` record (workflow nagemaakt in
  `src/workflows/voorinspectie-afgerond.ts`).
- **Rollup `Aantal_ruimtes`** — count van related Ruimtes; Zoho beheert deze
  automatisch zodra er ruimtes worden toegevoegd.
