/**
 * Human-readable metadata + Mermaid diagrams for every workflow we run.
 * Used by the /processen UI to explain what each automation does.
 *
 * When adding a new workflow:
 * 1. Register it in src/workflows/registry.ts.
 * 2. Add an entry here keyed by the workflow id (or cron path).
 */

export type ProcessDef = {
  id: string;
  title: string;
  /** "webhook" or "cron" — controls badge in UI. */
  kind: "webhook" | "cron";
  /** One-line summary shown on the index card. */
  summary: string;
  /** When does this workflow run? Plain Dutch. */
  trigger: string;
  /** What does it do? Plain Dutch. */
  what: string;
  /** Mermaid flowchart source (without the ```mermaid fence). */
  mermaid: string;
  /** Optional list of relevant Zoho field names this process reads/writes. */
  fields?: { module: string; name: string; purpose: string }[];
  /** Zoho-CRM workflow rules this portal process replaces (cutover note). */
  supersedes?: { name: string; id?: string; disabledOn?: string }[];
};

export const PROCESSES: Record<string, ProcessDef> = {
  "vi-reschedule": {
    id: "vi-reschedule",
    title: "Voorinspectie verzetten (VI reschedule)",
    kind: "webhook",
    summary:
      "Aannemer of klant stelt een nieuwe VI-datum voor. Het systeem checkt de bufferregel (≥ 7 + langste levertijd) en regelt de afhandeling, inclusief eventuele leverdatum-wijziging.",
    trigger:
      "Zoho-werkflowsregel `LAB21 — VI Reschedule webhook` (op de Voorinspecties module). Vuurt zodra een van deze 4 velden wijzigt: VI_Voorstel_Status, VI_Branch_Gekozen, VI_Tegenpartij_Reactie, VI_Nieuwe_Leverdatum_Voorstel.",
    what:
      "Leest de Voorinspectie + gekoppelde Verkooporder + producten. Snapshot de buffer (7 + max Levertijd). Doorloopt de beslisboom in code en schrijft de uitkomst (status, nieuwe leverdatum, todo voor inkoop & planning, tijdlijn-mijlpaal) terug naar Zoho.",
    mermaid: `flowchart TD
  Start([Aanvrager stelt nieuwe<br/>VI-datum voor]) --> S1
  S1{Status =<br/>awaiting_evaluation}
  S1 -- Ja --> Buffer{Gap ≥ 7 + langste<br/>Levertijd in dagen?}
  Buffer -- Buffer OK --> Tegenpartij[/Status → awaiting_tegenpartij<br/>Notify tegenpartij<br/>Log tijdlijn/]
  Buffer -- Buffer te krap --> Kiezen[/Status → aanvrager_moet_kiezen<br/>Notify aanvrager/]
  Kiezen --> S2{Branch gekozen?}
  S2 -- A nieuwe VI-datum --> Reset[/Status → none<br/>Nieuwe ronde/]
  S2 -- B klant kiest<br/>nieuwe leverdatum --> Wacht[/Status → awaiting_klant_leverdatum<br/>Notify klant/]
  Tegenpartij --> S3{Tegenpartij<br/>reactie?}
  S3 -- Accepted --> Done[/commit Datum_tijd<br/>Status → done<br/>Log tijdlijn<br/>Todo voor inkoop_planning/]
  S3 -- Rejected --> Reset
  Wacht --> KlantSubmit([Klant geeft nieuwe<br/>leverdatum + toelichting])
  KlantSubmit --> Update[/update Verkooporder.Due_Date/]
  Update --> ReBuffer{Buffer opnieuw OK<br/>met nieuwe leverdatum?}
  ReBuffer -- Ja --> Tegenpartij
  ReBuffer -- Nee --> Reset
  Update --> Todos[/Todo voor inkoop_planning<br/>+ Todo voor accountmanager/]
  Done --> EndOK([Klaar])
  Reset --> Start
`,
    fields: [
      { module: "Voorinspecties", name: "VI_Voorstel_Status", purpose: "Waar we in de flow staan" },
      { module: "Voorinspecties", name: "VI_Voorgestelde_Datum", purpose: "De voorgestelde nieuwe VI-datum" },
      { module: "Voorinspecties", name: "VI_Voorgesteld_Door", purpose: "Aannemer of klant" },
      { module: "Voorinspecties", name: "VI_Buffer_Snapshot_Dagen", purpose: "Buffer-eis bij start van de ronde" },
      { module: "Voorinspecties", name: "VI_Branch_Gekozen", purpose: "A (nieuwe datum) of B (klant kiest leverdatum)" },
      { module: "Voorinspecties", name: "VI_Tegenpartij_Reactie", purpose: "accepted / rejected" },
      { module: "Voorinspecties", name: "VI_Geaccepteerd_Tijdslot_Van", purpose: "Welk tijdblok gekozen bij acceptatie" },
      { module: "Voorinspecties", name: "Datum_tijd", purpose: "De daadwerkelijke (gecommitte) VI-datum/tijd" },
      { module: "Voorinspecties", name: "Verkooporders", purpose: "Lookup naar Sales_Order voor Leverdatum + producten" },
      { module: "Sales_Orders", name: "Due_Date", purpose: "Gewenste leverdatum (primair)" },
      { module: "Sales_Orders", name: "Verwachte_leverdatum", purpose: "Fallback leverdatum als Due_Date leeg is" },
      { module: "Sales_Orders", name: "Ordered_Items", purpose: "Subform met line items → product-ids" },
      { module: "Products", name: "Levertijd_in_dagen", purpose: "Per product. Max wordt gebruikt voor buffer" },
      { module: "Tasks", name: "Department", purpose: "accountmanager of inkoop_planning — bepaalt todo-lijst" },
    ],
    supersedes: [
      { name: "LAB21-T177 - Datum voorinspectie updaten na acceptatie", id: "728921000009873232", disabledOn: "2026-05-24" },
      { name: "LAB21-T180 - Klant informeren over keuze voorinspectie datum/tijd", id: "728921000009873609", disabledOn: "2026-05-24" },
      { name: "LAB21-T182 - Actie accountmanager als klant niet reageert", id: "728921000010083298", disabledOn: "2026-05-24" },
      { name: "LAB21-T183 - Herinnering acceptatie voorgestelde dagen na 24 uur", id: "728921000010083459", disabledOn: "2026-05-24" },
    ],
  },

  "voorinspectie-akkoord": {
    id: "voorinspectie-akkoord",
    title: "Voorinspectie akkoord → Planning aanmaken",
    kind: "webhook",
    summary:
      "Wanneer een Voorinspectie naar status 'Akkoord klant VI' gaat, wordt automatisch een Planning record aangemaakt zodat de uitvoeringsketen kan starten.",
    trigger:
      "Zoho webhook op de Voorinspecties module bij Fase-wijziging. Payload bevat Voorinspectie-id, nieuwe status, en gegevens van de aannemer + klant.",
    what:
      "Als de status == 'Akkoord klant VI', maak een Planning record aan met Voorinspectie-link, aannemer, klant, gewenste leverdatum. Hierna kan de uitvoeringsketen (Verwijderen → Voorbereiden → ... → Afwerken) starten.",
    mermaid: `flowchart TD
  Trigger([Voorinspectie status wijzigt]) --> Check{Status =<br/>Akkoord klant VI?}
  Check -- Nee --> Skip([Geen actie])
  Check -- Ja --> Bestaat{Planning bestaat al?}
  Bestaat -- Ja --> Skip
  Bestaat -- Nee --> Create[/Maak Planning record:<br/>Voorinspectie-link<br/>Aannemer<br/>Klant<br/>Gewenste leverdatum/]
  Create --> Done([Planning klaar voor uitvoering])
`,
    fields: [
      { module: "Voorinspecties", name: "Status", purpose: "Triggert de workflow" },
      { module: "Voorinspecties", name: "Aannemer", purpose: "Wordt gekopieerd naar Planning" },
      { module: "Voorinspecties", name: "Contactpersoon", purpose: "Klant op de Planning" },
      { module: "Voorinspecties", name: "Gewenste_leverdatum", purpose: "Streef-leverdatum op Planning" },
      { module: "Planningen", name: "(nieuw)", purpose: "Het record dat we aanmaken" },
    ],
  },

  "voorinspectie-no-response": {
    id: "voorinspectie-no-response",
    title: "Voorinspectie: geen klant-reactie",
    kind: "cron",
    summary:
      "Voorinspecties die ≥ 3 dagen vastzitten in 'Wachten op bevestiging' krijgen automatisch status 'Geen reactie' + een tijdlijn-mijlpaal voor de accountmanager.",
    trigger:
      "Dagelijkse cron job `/api/cron/voorinspectie-no-response` (08:30 UTC).",
    what:
      "Scant alle Voorinspecties met status 'Wachten op bevestiging' die ≥ 3 dagen niet zijn aangepast. Voor elke gevonden record: status → 'Geen reactie', Datums_2-mijlpaal aanmaken, accountmanager als notificatie.",
    mermaid: `flowchart TD
  Cron([Cron @ 08:30 UTC]) --> Scan[Scan Voorinspecties<br/>status = Wachten op bevestiging<br/>Modified_Time ≤ 3 dagen geleden]
  Scan --> Loop{Voor elke<br/>gevonden record}
  Loop --> Update[/Status → Geen reactie/]
  Update --> Log[/Datums_2 mijlpaal:<br/>'Klant heeft niet gereageerd'/]
  Log --> Notify[/Accountmanager taak:<br/>bel de klant/]
  Notify --> Loop
  Loop -- klaar --> Done([Klaar])
`,
    fields: [
      { module: "Voorinspecties", name: "Status", purpose: "Wordt gewijzigd naar 'Geen reactie'" },
      { module: "Voorinspecties", name: "Modified_Time", purpose: "Bepaalt wanneer 3 dagen om zijn" },
      { module: "Voorinspecties", name: "Accountmanager", purpose: "Wordt genotificeerd" },
      { module: "Datums_2", name: "(nieuw)", purpose: "Tijdlijn-mijlpaal aangemaakt" },
    ],
  },

  "showroom-afspraak-geweest": {
    id: "showroom-afspraak-geweest",
    title: "Showroom-afspraak geweest → review + tijdlijn",
    kind: "webhook",
    summary:
      "Wanneer een Showroom-afspraak fase naar 'Geweest' gaat, wordt een tijdlijn-mijlpaal vastgelegd en een review-aanvraag in de queue gezet voor 3 dagen later.",
    trigger:
      "Zoho webhook op de Showroom module bij Fase-wijziging.",
    what:
      "Als Fase == 'Geweest', maak een Datums_2-mijlpaal aan met code SHOWROOM-GEWEEST. Een aparte cron (showroom-review-followup, dagelijks 08:00 UTC) handelt de review-aanvraag 3 dagen later af.",
    mermaid: `flowchart TD
  Trigger([Showroom fase wijzigt]) --> Check{Fase =<br/>Geweest?}
  Check -- Nee --> Skip([Geen actie])
  Check -- Ja --> Bestaat{Mijlpaal bestaat al<br/>voor deze verkoopkans?}
  Bestaat -- Ja --> Skip
  Bestaat -- Nee --> Log[/Maak Datums_2:<br/>Code = SHOWROOM-GEWEEST<br/>Verkoopkans + Contactpersoon/]
  Log --> Queue([Wacht op cron review-followup<br/>3 dagen later])
`,
    fields: [
      { module: "Showroom", name: "Fase", purpose: "Triggert workflow als = 'Geweest'" },
      { module: "Showroom", name: "Verkoopkans", purpose: "Wordt gekoppeld aan mijlpaal" },
      { module: "Showroom", name: "Contactpersoon", purpose: "Wordt gekoppeld aan mijlpaal" },
      { module: "Datums_2", name: "Code = SHOWROOM-GEWEEST", purpose: "Mijlpaal-record" },
    ],
  },

  "klantenservice-nieuw-toewijzen": {
    id: "klantenservice-nieuw-toewijzen",
    title: "Nieuwe klantenservice-klacht → toewijzen",
    kind: "webhook",
    summary:
      "Nieuwe Klantenservice-klacht wordt automatisch toegewezen aan de eigenaar van de gerelateerde Verkooporder + tijdlijn-mijlpaal.",
    trigger:
      "Zoho webhook op de Klantenservice module bij record-aanmaak.",
    what:
      "Zoekt de eigenaar van de gerelateerde Verkooporder via lookup. Wijst de Klantenservice-record toe aan die accountmanager. Maakt een Datums_2-mijlpaal aan voor zichtbaarheid in de tijdlijn-UI.",
    mermaid: `flowchart TD
  Trigger([Nieuwe Klantenservice<br/>record aangemaakt]) --> Lookup[Zoek gerelateerde<br/>Verkooporder]
  Lookup --> HasSO{Verkooporder<br/>gevonden?}
  HasSO -- Nee --> NoSO[/Log: geen verkooporder<br/>aan ks gekoppeld/]
  HasSO -- Ja --> Owner[Bepaal accountmanager<br/>= Verkooporder.Owner]
  Owner --> Assign[/Wijs ks toe aan owner/]
  Assign --> Log[/Datums_2 mijlpaal:<br/>'Klantenservice gestart'/]
  Log --> Done([Klaar])
`,
    fields: [
      { module: "Klantenservice", name: "Verkooporder", purpose: "Lookup om accountmanager te vinden" },
      { module: "Klantenservice", name: "Owner", purpose: "Wordt gezet op accountmanager" },
      { module: "Sales_Orders", name: "Owner", purpose: "Bron van accountmanager-toewijzing" },
      { module: "Datums_2", name: "(nieuw)", purpose: "Tijdlijn-mijlpaal" },
    ],
  },

  "vi-reschedule-stuck": {
    id: "vi-reschedule-stuck",
    title: "VI-reschedule reconciliation (vastloper-detector)",
    kind: "cron",
    summary:
      "Vangnet voor gemiste webhooks: Voorinspecties die ≥ 24 uur in een non-terminal VI_Voorstel_Status hangen, worden opnieuw door de orchestrator gestuurd.",
    trigger:
      "Dagelijkse cron `/api/cron/vi-reschedule-stuck` (07:00 UTC).",
    what:
      "Zoekt alle Voorinspecties waar VI_Voorstel_Status niet 'done', 'rejected' of 'none' is én Modified_Time ≥ 24u geleden. Roept voor elk record handmatig runReschedule() aan zodat de stateless re-evaluatie de flow alsnog voortzet.",
    mermaid: `flowchart TD
  Cron([Cron @ 07:00 UTC]) --> Search[Search Voorinspecties:<br/>VI_Voorstel_Status ≠ done/rejected/none<br/>Modified_Time ≤ 24u geleden]
  Search --> Loop{Voor elk<br/>vastlopend record}
  Loop --> Run[runReschedule\\(voorinspectieId\\)]
  Run --> Same[Orchestrator herwaardeert]
  Same --> Loop
  Loop -- klaar --> Report([Rapport:<br/>aantal gecheckt, aantal hersteld])
`,
    fields: [
      { module: "Voorinspecties", name: "VI_Voorstel_Status", purpose: "Filter voor non-terminal records" },
      { module: "Voorinspecties", name: "Modified_Time", purpose: "Hoe lang vastgelopen" },
    ],
  },

  "showroom-review-followup": {
    id: "showroom-review-followup",
    title: "Showroom-bezoek → review opvolging",
    kind: "cron",
    summary:
      "Drie dagen na een showroom-bezoek wordt automatisch een review-aanvraag verzonden naar de klant.",
    trigger:
      "Dagelijkse cron `/api/cron/showroom-review-followup` (08:00 UTC).",
    what:
      "Scant Showroom-records met Fase=Geweest, Modified_Time ≥ 3 dagen geleden, zonder bestaande Review. Voor elk: maak een Reviews record aan + verstuur de review-aanvraag e-mail.",
    mermaid: `flowchart TD
  Cron([Cron @ 08:00 UTC]) --> Scan[Scan Showroom:<br/>Fase = Geweest<br/>Modified_Time ≤ 3 dagen geleden<br/>geen Review record]
  Scan --> Loop{Voor elk record}
  Loop --> Create[/Maak Reviews record/]
  Create --> Mail[/Verstuur review-aanvraag mail/]
  Mail --> Loop
  Loop -- klaar --> Done([Klaar])
`,
    fields: [
      { module: "Showroom", name: "Fase", purpose: "Filter op = Geweest" },
      { module: "Showroom", name: "Modified_Time", purpose: "3 dagen wachttijd" },
      { module: "Reviews", name: "(nieuw)", purpose: "Review-aanvraag record" },
    ],
  },
};
