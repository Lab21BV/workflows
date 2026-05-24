# VI-reschedule chain — design

**Author:** Victor (XCX International)
**Drafted with:** Claude Opus 4.7 (1M context)
**Date:** 2026-05-24
**Status:** Design locked; ready for implementation plan.
**Architecture reference:** https://workflows-two.vercel.app/architecture (also `app/architecture/page.tsx`)

---

## 1. Summary

Build the "voorinspectie reschedule" decision chain inside the **LAB21 Operations** app. The chain triggers when an aannemer or klant proposes a new VI date/time blocks via a portal. It validates the proposal against a buffer rule, branches into either "tegenpartij accepts" or "klant chooses a new leverdatum," and applies all downstream effects (status updates, cascading changes to Sales_Orders, tijdlijn logging, notifications).

The chain replaces the Zoho-native workflow rules that cannot fire each other — instead, all chaining lives in code in this repo (`workflows-two`). Zoho remains the source of truth for record state.

## 2. Background and motivation

Zoho CRM workflow rules cannot trigger other workflow rules from their own field updates. For multi-step business processes this creates a wall: each step has to be triggered by a *new* external event. LAB21 has several such chains (this one is the first) and needs a unified pattern to solve them.

The chosen pattern — locked-in on 2026-05-24 — is **stateless re-evaluation in LAB21 Operations**: any relevant change in Zoho fires a webhook, the orchestrator reads current state, runs a pure decision tree, and writes outcomes back. State lives in Zoho fields; no separate database. See the architecture page for the macro-level design and rationale.

## 3. Scope

**In scope:**
- The decision tree for the VI-reschedule chain
- Zoho field additions on the Voorinspecties module
- The webhook handler routing and pure-function evaluator
- The repository abstraction layer (`src/repo/*`) for Voorinspecties, Sales_Orders, Products, and Tijdlijn
- A reconciliation cron at `/api/cron/vi-reschedule-stuck`
- Unit + integration tests
- Observability via structured logs and Tijdlijn audit rows

**Out of scope:**
- Klantenportal UI (separate app, separate session)
- Aannemersportal UI (separate app, separate session)
- Replacing the corresponding Zoho-native workflow rules (will run in parallel first)
- Multi-language notification templates (placeholders for now; real templates wired in later)
- Postgres migration (architecture supports it but it is future work)

## 4. Business rule (the flow)

Source flow as drawn by the user, re-stated in plain language:

1. Aannemer or klant proposes new VI date/time blocks via their portal.
2. Compute the buffer requirement: `buffer = 7 + max(Levertijd) across all Products on the Sales_Order`.
3. Check: `(Leverdatum_origineel − VI_voorgestelde_datum) ≥ buffer`?
   - **Yes** → ask the **tegenpartij** (the other party) to accept or reject.
     - **Accept** → done. VI is rescheduled.
     - **Reject** → start a fresh round; original VI date remains until accepted.
   - **No** → ask the **aanvrager** to pick a branch:
     - **Branch A** — propose a different VI date that fits within the buffer (returns to step 1).
     - **Branch B** — declare the VI date is essential; klant is asked to provide a new leverdatum + toelichting.
       - New leverdatum **later** than original → run "Protocol veranderen leverdatum naar later."
       - New leverdatum **earlier** than original → run "Protocol veranderen leverdatum naar eerder."

"Tegenpartij" is the party that did *not* originate the current proposal (e.g., if aannemer proposed, klant is tegenpartij).

## 5. Data model — new fields on `Voorinspecties`

These are added once via Zoho Setup → Modules → Voorinspecties → Fields. All are additive; no existing fields are modified or removed.

| API name | Type | Values / notes |
|---|---|---|
| `VI_Voorstel_Status` | Picklist | `none`, `awaiting_evaluation`, `awaiting_tegenpartij`, `aanvrager_moet_kiezen`, `awaiting_klant_leverdatum`, `klant_kiest_leverdatum`, `done`, `rejected` |
| `VI_Voorgestelde_Datum` | Date | The newly proposed VI date |
| `VI_Voorgestelde_Tijdblokken` | Multiline text (JSON) | `[{"van":"09:00","tot":"12:00"}, …]` |
| `VI_Voorgesteld_Door` | Picklist | `aannemer` / `klant` |
| `VI_Voorstel_Aangemaakt` | DateTime | Timestamp of proposal — used for staleness and audit |
| `VI_Buffer_Snapshot_Dagen` | Integer | Snapshot of `7 + langste levertijd` at the moment the chain begins; protects against race conditions where a configurator changes a Product's levertijd mid-flow |
| `VI_Branch_Gekozen` | Picklist | `A_nieuwe_vi_datum`, `B_klant_kiest_leverdatum`, null |
| `VI_Nieuwe_Leverdatum_Voorstel` | Date | Set by klantenportal when klant offers a new leverdatum |
| `VI_Toelichting_Klant` | Multiline text | Required when branch B is chosen |
| `VI_Tegenpartij_Reactie` | Picklist | `pending`, `accepted`, `rejected`, null |
| `VI_Reschedule_Cyclus` | Integer | Round counter; default 0; increments each fresh round |

Audit history is NOT stored on the Voorinspectie record. Each state transition is logged as a `Datums_2` (tijdlijn) row, which keeps audit data normalized and viewable in the existing `/tijdlijn` UI.

**The existing committed-VI field is `Datum_tijd`** (label: "Datum/tijd voorinspectie", type: datetime). This is what holds the actual scheduled VI moment. When a reschedule reaches `done` from the buffer-ok path (Stage 3, tegenpartij accepted), the orchestrator writes the agreed datetime to `Datum_tijd`. The reschedule proposal fields (`VI_Voorgestelde_Datum`, `VI_Voorgestelde_Tijdblokken`) are scratchpad; they do not replace `Datum_tijd` until acceptance.

**Tijdblokken → single datetime collapse.** The aanvrager proposes one date plus a list of tijdblokken (candidate windows). At acceptance, the tegenpartij must pick one specific tijdblok — this becomes the committed `Datum_tijd`. Two new sub-fields support this:

- `VI_Geaccepteerd_Tijdslot_Van` (DateTime) — start of the tegenpartij-selected window. Required when `VI_Tegenpartij_Reactie = accepted`.
- `VI_Geaccepteerd_Tijdslot_Tot` (DateTime) — end of selected window. Optional; recorded for audit but not committed to `Datum_tijd`.

The orchestrator commits `VI_Geaccepteerd_Tijdslot_Van` to `Datum_tijd` when transitioning to `done`.

## 6. Decision tree as code

The decision tree is a **pure function** — no I/O, no API calls. It takes a snapshot of state and returns a list of `Outcome` records describing what should happen next. A separate `applyOutcomes` function performs the I/O.

```ts
// src/workflows/vi-reschedule/types.ts
type Aanvrager = "aannemer" | "klant";
type VoorstelStatus =
  | "none"
  | "awaiting_evaluation"
  | "awaiting_tegenpartij"
  | "aanvrager_moet_kiezen"
  | "awaiting_klant_leverdatum"
  | "klant_kiest_leverdatum"
  | "done"
  | "rejected";

type VoorinspectieRecord = {
  id: string;
  Leverdatum_Origineel: string;
  VI_Voorstel_Status: VoorstelStatus;
  VI_Voorgestelde_Datum: string | null;
  VI_Voorgesteld_Door: Aanvrager | null;
  VI_Buffer_Snapshot_Dagen: number | null;
  VI_Branch_Gekozen: "A_nieuwe_vi_datum" | "B_klant_kiest_leverdatum" | null;
  VI_Nieuwe_Leverdatum_Voorstel: string | null;
  VI_Tegenpartij_Reactie: "pending" | "accepted" | "rejected" | null;
  VI_Geaccepteerd_Tijdslot_Van: string | null;   // datetime
  Datum_tijd: string | null;                      // existing field — the committed VI datetime
};

type Department = "accountmanager" | "inkoop_planning";

type Outcome =
  | { kind: "set_status"; status: VoorstelStatus; reason?: string }
  | { kind: "notify_portal_user"; who: Aanvrager | "klant" | "aannemer"; template: string }
  | { kind: "create_todo"; department: Department; title: string; body: string }
  | { kind: "update_leverdatum"; nieuweDatum: string; direction: "later" | "eerder" }
  | { kind: "commit_vi_datetime"; datetime: string }   // writes to Datum_tijd
  | { kind: "log_tijdlijn"; event: string };
```

```ts
// src/workflows/vi-reschedule/evaluate.ts
export function evaluateReschedule(
  vi: VoorinspectieRecord,
  langsteLevertijdDagen: number,
): Outcome[] {
  const out: Outcome[] = [];

  // Stage 1 — buffer check on a new proposal
  if (vi.VI_Voorstel_Status === "awaiting_evaluation") {
    const buffer = vi.VI_Buffer_Snapshot_Dagen ?? 7 + langsteLevertijdDagen;
    const gap = daysBetween(vi.VI_Voorgestelde_Datum!, vi.Leverdatum_Origineel);
    if (gap >= buffer) {
      out.push({ kind: "set_status", status: "awaiting_tegenpartij" });
      out.push({ kind: "notify_portal_user", who: tegenpartij(vi.VI_Voorgesteld_Door!), template: "vi_voorstel_review" });
      out.push({ kind: "log_tijdlijn", event: "VI-voorstel geaccepteerd voor review (buffer ok)" });
    } else {
      out.push({ kind: "set_status", status: "aanvrager_moet_kiezen", reason: `Buffer ${buffer} dagen niet gehaald (${gap} dagen)` });
      out.push({ kind: "notify_portal_user", who: vi.VI_Voorgesteld_Door!, template: "vi_buffer_te_krap" });
    }
    return out;
  }

  // Stage 2 — aanvrager chose a branch
  if (vi.VI_Voorstel_Status === "aanvrager_moet_kiezen" && vi.VI_Branch_Gekozen) {
    if (vi.VI_Branch_Gekozen === "A_nieuwe_vi_datum") {
      out.push({ kind: "set_status", status: "none", reason: "Nieuwe ronde — aanvrager kiest andere VI-datum" });
    } else {
      out.push({ kind: "set_status", status: "awaiting_klant_leverdatum" });
      out.push({ kind: "notify_portal_user", who: "klant", template: "vraag_nieuwe_leverdatum_met_toelichting" });
    }
    return out;
  }

  // Stage 3 — tegenpartij reacted
  if (vi.VI_Voorstel_Status === "awaiting_tegenpartij" && vi.VI_Tegenpartij_Reactie) {
    if (vi.VI_Tegenpartij_Reactie === "accepted") {
      if (!vi.VI_Geaccepteerd_Tijdslot_Van) {
        out.push({ kind: "set_status", status: "rejected", reason: "Acceptatie zonder gekozen tijdslot — portal-bug" });
        return out;
      }
      out.push({ kind: "commit_vi_datetime", datetime: vi.VI_Geaccepteerd_Tijdslot_Van });
      out.push({ kind: "set_status", status: "done" });
      out.push({ kind: "log_tijdlijn", event: `VI-datum ${vi.VI_Geaccepteerd_Tijdslot_Van} bevestigd door beide partijen` });
      // Inkoop & Planning need to react to the new VI moment (logistics, levering).
      out.push({
        kind: "create_todo",
        department: "inkoop_planning",
        title: `VI-datum gewijzigd voor ${vi.id}`,
        body: `Nieuwe VI-datum: ${vi.VI_Geaccepteerd_Tijdslot_Van}. Controleer of inkoop/levering aansluit.`,
      });
    } else {
      out.push({ kind: "set_status", status: "none", reason: "Tegenpartij weigerde; ronde opnieuw" });
      out.push({ kind: "notify_portal_user", who: vi.VI_Voorgesteld_Door!, template: "vi_tegenpartij_weigert" });
    }
    return out;
  }

  // Stage 4 — klant gave a new leverdatum
  if (vi.VI_Voorstel_Status === "klant_kiest_leverdatum" && vi.VI_Nieuwe_Leverdatum_Voorstel) {
    const direction = isLater(vi.VI_Nieuwe_Leverdatum_Voorstel, vi.Leverdatum_Origineel) ? "later" : "eerder";
    out.push({ kind: "update_leverdatum", nieuweDatum: vi.VI_Nieuwe_Leverdatum_Voorstel, direction });

    // Re-check buffer against the proposed VI date with the new leverdatum.
    // Required because klant may have chosen an earlier leverdatum that still
    // doesn't give enough headroom, or even a later one that's only barely OK.
    const buffer = vi.VI_Buffer_Snapshot_Dagen ?? 7 + langsteLevertijdDagen;
    const gap = daysBetween(vi.VI_Voorgestelde_Datum!, vi.VI_Nieuwe_Leverdatum_Voorstel);

    if (gap >= buffer) {
      out.push({ kind: "set_status", status: "awaiting_tegenpartij" });
      out.push({ kind: "notify_portal_user", who: tegenpartij(vi.VI_Voorgesteld_Door!), template: "vi_voorstel_review_na_leverdatum" });
      out.push({ kind: "log_tijdlijn", event: `Leverdatum → ${vi.VI_Nieuwe_Leverdatum_Voorstel} (${direction}); buffer nu ok → tegenpartij beslist` });
    } else {
      out.push({ kind: "set_status", status: "none", reason: `Nieuwe leverdatum onvoldoende (gap ${gap}, vereist ${buffer}); nieuwe ronde` });
      out.push({ kind: "notify_portal_user", who: vi.VI_Voorgesteld_Door!, template: "vi_leverdatum_onvoldoende" });
      out.push({ kind: "log_tijdlijn", event: `Leverdatum → ${vi.VI_Nieuwe_Leverdatum_Voorstel} (${direction}); buffer ${buffer} > gap ${gap} → nieuwe ronde` });
    }
    // Leverdatum changed regardless of branch — internal departments react.
    out.push({
      kind: "create_todo",
      department: "inkoop_planning",
      title: `Leverdatum gewijzigd (${direction}) voor ${vi.id}`,
      body: `Nieuwe leverdatum: ${vi.VI_Nieuwe_Leverdatum_Voorstel} (oorspronkelijk ${vi.Leverdatum_Origineel}). Controleer inkoop en levering.`,
    });
    out.push({
      kind: "create_todo",
      department: "accountmanager",
      title: `Klant heeft leverdatum aangepast voor ${vi.id}`,
      body: `Nieuwe leverdatum (${direction}): ${vi.VI_Nieuwe_Leverdatum_Voorstel}. Toelichting klant: ${vi.VI_Toelichting_Klant ?? "—"}.`,
    });
    return out;
  }

  return out;
}

function tegenpartij(a: Aanvrager): Aanvrager {
  return a === "aannemer" ? "klant" : "aannemer";
}
```

## 6a. Department todo system

Notifications to internal staff are **todo items**, not emails. Two departments consume them:

| Department | Role | What they react to |
|---|---|---|
| `accountmanager` | Owns the customer relationship and order | Klant-initiated changes, escalations, anything customer-facing |
| `inkoop_planning` | Owns purchasing & delivery scheduling | Leverdatum changes, VI date changes, anything that shifts logistics |

The todo system is implemented as **Zoho `Tasks` module records** with one added custom field:

| Field | Type | Values |
|---|---|---|
| `Department` | Picklist | `accountmanager`, `inkoop_planning` |

When the evaluator emits `{ kind: "create_todo", department, title, body }`, the orchestrator creates a `Tasks` record:

- `Subject` = `title`
- `Description` = `body`
- `Status` = `Not Started`
- `Department` = department
- `Related Voorinspectie` = the originating VI record (lookup)
- `Due Date` = today + 1 day (configurable later)
- `Owner` = unassigned (the department list view picks it up)

Two new pages in this app:

- `/todo/accountmanager` — lists open Tasks where `Department = accountmanager AND Status != Completed`, sorted by `Created_Time DESC`
- `/todo/inkoop-planning` — same for `inkoop_planning`

Each row: title, body, link to the related Voorinspectie (via `/tijdlijn/[id]`), and a "Mark resolved" button that PATCHes `Status = Completed` on the Zoho Tasks record. No own database — Zoho Tasks is the store.

External-facing notifications (to klant or aannemer) keep the existing `notify_portal_user` outcome — they appear in the respective portals via Zoho field polling, as the architecture page describes. They are NOT todos.

## 7. Repository abstraction

All Zoho calls live in `src/repo/*`. The decision tree and orchestrator import from `src/repo/*`, never from `src/zoho/*`. This is the "thin wall" that makes a future Postgres swap a per-file change.

```
src/repo/voorinspecties.ts   — getVoorinspectie, update, applyOutcomes
src/repo/sales-orders.ts     — get, updateLeverdatum
src/repo/products.ts         — getMany
src/repo/tijdlijn.ts         — logEvent
src/repo/tasks.ts            — createTodo, listOpen(department), markResolved
```

Each file is small (~30 lines) and wraps the existing `ZohoClient`.

## 8. API surface and webhook configuration

**One inbound endpoint** for this chain:

```
POST /api/webhooks/zoho
  Headers:
    Authorization: Bearer <ZOHO_WEBHOOK_SECRET>
    x-workflow: vi-reschedule
  Body:
    { "voorinspectieId": "<zoho-record-id>" }
```

The route is already wired in `app/api/webhooks/zoho/route.ts`. The new workflow registers via `src/workflows/registry.ts`.

**Zoho workflow rule** (one-time setup in Zoho Setup → Automation → Workflow Rules):

| Setting | Value |
|---|---|
| Module | `Voorinspecties` |
| Trigger | On Field Update for: `VI_Voorstel_Status`, `VI_Branch_Gekozen`, `VI_Tegenpartij_Reactie`, `VI_Nieuwe_Leverdatum_Voorstel` |
| Action | Webhook |
| Method | POST |
| URL | `https://workflows-two.vercel.app/api/webhooks/zoho` |
| Custom parameter | `voorinspectieId = ${id}` |
| Custom header | `Authorization: Bearer <ZOHO_WEBHOOK_SECRET>` |
| Custom header | `x-workflow: vi-reschedule` |

Listening only to those four fields keeps the webhook from firing on irrelevant edits (`Modified_Time`, etc.).

## 9. End-to-end example

**Setup:** Voorinspectie VI-501, linked Sales_Order SO-302, three Products with Levertijd 10/12/14 → langste = 14. Original Leverdatum = 2026-07-15.

| Step | Actor | Write to Zoho | Orchestrator decision | New state |
|---|---|---|---|---|
| 1 | Aannemer (via portal) | `VI_Voorgestelde_Datum=2026-06-25`, `VI_Voorgesteld_Door=aannemer`, `VI_Voorstel_Status=awaiting_evaluation` | gap=20, buffer=21 → buffer broken → aanvrager moet kiezen | `aanvrager_moet_kiezen` |
| 2 | Aannemer | `VI_Branch_Gekozen=B_klant_kiest_leverdatum` | branch B → ask klant | `awaiting_klant_leverdatum` |
| 3 | Klant (via portal) | `VI_Nieuwe_Leverdatum_Voorstel=2026-07-20`, `VI_Toelichting_Klant=…`, `VI_Voorstel_Status=klant_kiest_leverdatum` | later → update SO-302 leverdatum; mark done | `done` (SO-302.Leverdatum=2026-07-20, Datums_2 row logged) |

Each step is a single Zoho write from the portal → webhook → orchestrator → outcome writes back. No persistent state in the orchestrator.

## 10. Error handling

| Failure mode | Handling |
|---|---|
| Portal writes invalid intent | Decision tree returns `{kind:"set_status", status:"rejected", reason}` + notification. |
| Zoho API 5xx / timeout | Throw → handler returns 500 → Zoho retries the webhook → stateless re-eval picks up where it left off. |
| Webhook auth failure | Return 401. Handled in existing route. |
| Unknown voorinspectie id | Return 404, log, drop. |
| Decision tree returns no outcomes | Log "no-op", return 200. Tolerates manual admin edits that don't match any branch. |
| `evaluateReschedule` throws | Log full state to `console.error`, return 500. Zoho retries; bug surfaces in logs. |

## 11. Race conditions

| Race | Mitigation |
|---|---|
| Two webhooks arrive for the same VI nearly simultaneously | Decision tree is idempotent — both calls reach the same conclusion. Worst case: duplicate notification. Add a `last_outcome_hash` field if it becomes a problem. |
| Orchestrator's own write fires a follow-on webhook | Re-eval reads the new state, hits a no-op branch, returns 0 outcomes → system self-quiesces. |
| Configurator updates `Products.Levertijd` mid-reschedule | `VI_Buffer_Snapshot_Dagen` is captured at chain start and used for all subsequent evaluations. |
| Portal optimistic UI shows "Bevestigd" before orchestrator rejects | Portals do pessimistic UI for orchestrator-gated steps — spinner "Wordt verwerkt…" until polling sees a terminal status (`done` / `rejected`). |

## 12. Testing strategy

**Unit tests on `evaluate.ts`** — the highest-leverage tier. Fixtures pin each transition; no mocking of Zoho.

```
src/workflows/vi-reschedule/
  evaluate.ts
  evaluate.test.ts
  run.ts
  run.test.ts
  fixtures/
    vi-buffer-ok.json
    vi-buffer-too-tight.json
    vi-tegenpartij-rejected.json
    vi-klant-leverdatum-later.json
    vi-klant-leverdatum-earlier.json
```

**Integration tests on `run.ts`** — small (~5 tests) with a fake `repo` object.

**Manual end-to-end** — once per change, by editing a real test Voorinspectie in Zoho and watching Vercel logs.

## 13. Observability

- **Structured logs** per webhook invocation: `{ voorinspectieId, status_before, outcomes, status_after, duration_ms }`. Extends existing `consoleLogger` in `src/index.ts`.
- **Tijdlijn audit rows** — every state transition writes a `Datums_2` record; viewable in the existing `/tijdlijn` UI.
- **Reconciliation cron** at `/api/cron/vi-reschedule-stuck` — runs nightly, finds Voorinspecties stuck in non-terminal statuses for >24h, logs them and notifies ops. Catches missed webhooks.

## 14. Rollout plan

| Step | Description | Risk | Verification |
|---|---|---|---|
| 1 | Build `evaluate.ts` + unit tests | None — pure code | `npm test` passes |
| 2 | Add new Zoho fields to Voorinspecties module + `Department` custom field to Tasks module | Low — additive | Fields visible in Zoho UI |
| 3 | Add `src/repo/*` wrappers (read-only first) | None — internal abstraction | Probe script returns expected shape |
| 4 | Build `run.ts`; register `vi-reschedule` in `registry.ts` | None until wired | Manual curl against `localhost:3000` |
| 5 | Build `/todo/accountmanager` + `/todo/inkoop-planning` pages | Low — read-only UI | Visit pages locally; render mock Tasks |
| 6 | Configure Zoho workflow rule + webhook | Medium — live traffic | Edit a test Voorinspectie, watch Vercel logs |
| 7 | Add `/api/cron/vi-reschedule-stuck` reconciliation | Low | Manual trigger; confirm expected stuck records |
| 8 | Disable existing parallel Zoho-native rules: `LAB21-T177`, `LAB21-T180`, `LAB21-T182`, `LAB21-T183` | Medium — behavior change for production records | Confirm new chain handles real reschedules before disabling; keep audit of disable dates |

Each step is independently shippable. If step 6 fails, steps 1–5 stay in production harmlessly (no webhook = no fires = no effect). Step 8 is the cutover point — only proceed once the new chain proves stable on real production traffic.

## 15. Open questions

These must be answered before implementation begins.

1. ~~**Actual VI date field — committing the proposal.**~~ ✅ Resolved 2026-05-24. Committed VI moment lives in the existing `Datum_tijd` field (label "Datum/tijd voorinspectie", type datetime). Spec §5 and §6 updated.

1a. ~~**Tijdblok selection at acceptance.**~~ ✅ Resolved 2026-05-24. Tegenpartij picks one specific tijdblok at acceptance (fields `VI_Geaccepteerd_Tijdslot_Van/Tot`). The chosen Van datetime is committed to `Datum_tijd`.

2. ~~**Notification delivery channels.**~~ ✅ Resolved 2026-05-24. Internal notifications are **todo items** rendered in this app, not email/Cliq. Two departments: `accountmanager` and `inkoop_planning`. Implementation via Zoho `Tasks` module + a new `Department` custom field. New pages `/todo/accountmanager` and `/todo/inkoop-planning` render department-scoped open tasks. See §6a.

3. ~~**Manual admin override.**~~ ✅ Resolved 2026-05-24. If an internal user manually sets `VI_Voorstel_Status=done` (or any other terminal status) from Zoho UI, the orchestrator treats it as a no-op. The admin's intent is authoritative.

4. ~~**Branch B leverdatum buffer re-evaluation.**~~ ✅ Resolved 2026-05-24. Re-evaluate buffer against the *proposed* VI date and the *new* leverdatum. If buffer satisfied → route to `awaiting_tegenpartij`. If buffer still broken → kick a fresh round.

   **Follow-up sub-question (NOT YET CONFIRMED) — design defaults to A:** when aanvrager = aannemer, the tegenpartij is the klant who *just* submitted the new leverdatum. The portal should:
   - **A** — show the acceptance UI immediately after leverdatum submission (single-screen flow). *(current default)*
   - **B** — send a separate notification and let the klant come back to accept.

5. ~~**Existing parallel Zoho-native workflows.**~~ ✅ Resolved 2026-05-24. Disable: `LAB21-T177 - Datum voorinspectie updaten na acceptatie`, `LAB21-T180 - Klant informeren over keuze voorinspectie datum/tijd`, `LAB21-T182 - Actie accountmanager als klant niet reageert`, `LAB21-T183 - Herinnering acceptatie voorgestelde dagen na 24 uur`. Cutover happens in rollout step 8, only after the new chain runs stably on real traffic. Keep an audit log of disable dates so we can re-enable if needed.
