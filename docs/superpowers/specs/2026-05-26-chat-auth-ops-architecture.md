# Chat, identity & ops architecture — design

**Author:** Victor (XCX International)
**Drafted with:** Claude Opus 4.7
**Date:** 2026-05-26
**Status:** Design captured; implementation deferred (auth → chat → ops in that order).
**Architecture reference:** https://lab21-operations.vercel.app/architecture (also `app/architecture/page.tsx`)

---

## 1. Summary

Add two new cross-cutting services to the LAB21 ecosystem — a **chat service**
(Rocket.Chat + Jitsi + Whisper, repo `Lab21BV/chat`) and a **central identity
provider** (self-hosted **Zitadel** on Leaseweb) — and define the operational
model for the latter, including the contract with Claude Code as routine-executor.

Both services sit beside the portals in the presentation layer; neither lives in
LAB21 Operations. LAB21 Operations remains the cross-app decision brain. Chat is
"dumb" infrastructure — it owns its own state (messages, transcripts, calls) and
only emits webhooks to LAB21 Operations when a chat event has business meaning
(e.g. a Whisper transcript flags "annuleren"). Identity is also "dumb" — it
issues OIDC tokens and nothing more; mapping from a Zitadel user to a Zoho
record lives in the mirror DB.

## 2. Background and motivation

Three problems were on the table:

1. **Chat across all portals.** HQ, aannemers and klanten need a shared
   communication surface, ideally with searchable evidence (transcripts of
   calls, photos in threads). Putting that data in Zoho is wrong — wrong tool,
   wrong volume, wrong access pattern. Putting the chat logic in each portal
   is wrong for the same reason cross-app business rules belong in LAB21
   Operations: it would drift across three codebases.

2. **Identity.** Today there is no unified identity layer. Klant and aannemer
   contacts live in Zoho without seats; LAB21 employees live in a Postgres
   `employees` table; future Lab21adviseurs will need verkoper login. With
   chat and three portals all needing auth, the absence of a central identity
   provider became blocking.

3. **Ops accountability.** Self-hosting auth (vs. paying for Clerk-style
   managed identity) saves money but adds 24/7 responsibility. The question
   was whether Claude Code can carry enough of that burden to make
   self-hosting viable for a small team.

## 3. Decisions

### 3.1 Chat is a cross-cutting service, not a portal

The repo `Lab21BV/chat` (Next.js + AI SDK + Vercel, fronting
Rocket.Chat + Jitsi + Whisper) is its own service in the presentation layer.
Each portal embeds the Rocket.Chat widget with SSO; users do not visit a
separate "chat site" — they get chat-in-context.

```
Presentation:   [Klant]   [Aannemer]   [Mgmt]   [Configurators]
                  ↕  ↘       ↕  ↘       ↕  ↘
                     [Chat Service] ← Rocket.Chat + Jitsi + Whisper
                            ↕
                    (business events only)
                            ↓
Orchestration:      [LAB21 Operations]
                            ↕
State:              [Zoho]  ←→  [Mirror Postgres]
                            ↑
                     [Zitadel (identity)] ← issues OIDC tokens to all of the above
```

### 3.2 Chat owns its own state

Messages, threads, calls, transcripts → Rocket.Chat's own Postgres/Mongo.
**Nothing chat-related goes to Zoho.** Two exceptions, both implemented as
webhooks from Rocket.Chat into LAB21 Operations:

- Whisper transcripts flagging business signals (e.g. "annuleer", "klacht",
  "schade") emit an event the orchestrator can act on.
- Files attached in a chat thread linked to a Voorinspectie are linked back to
  the Zoho record by reference (URL or chat-attachment ID), not by content.

### 3.3 Rooms hang on business objects, not the other way around

Each Zoho record that warrants a chat surface (Sales_Order, Voorinspectie)
gets a deterministic room name: `order-{zoho_id}`, `vi-{zoho_id}`. Rooms are
created and closed by LAB21 Operations — not by portals. The link is stored
in a new mirror-DB table `chat_room_links(room_id, zoho_module, zoho_id,
created_at, closed_at)`. This lets:

- portals deep-link from a record view straight into the right room,
- orchestrator archive rooms when a record closes,
- evidence (transcripts) be retrieved by Zoho record without scanning chat.

### 3.4 Identity: self-hosted Zitadel on Leaseweb

Chosen against Clerk / Auth0 (managed) and Authentik / Keycloak / Ory
(self-hosted alternatives). Reasoning:

- **Conceptual clean.** Identity is a first-class layer separate from any
  one app — the same model as the LAB21 Operations / mirror split.
- **No vendor lock-in.** Tokens are standard OIDC; switching providers later
  is bounded work.
- **Data stays on Leaseweb.** Aligns with the on-prem direction the rest of
  the stack is taking.
- **Zitadel specifically** because: single Go binary (light), modern admin UI,
  multi-tenant out of the box (useful if klant-organisations become first-class
  later), active development. Keycloak is the safer choice but feels dated;
  Authentik is the close runner-up.

Trade-off accepted: ~€30-45/mo of additional ops cost (alerting, backups,
SMTP) in exchange for ~€100-500/mo of managed-identity SaaS cost, plus the
patching/incident burden. The latter is offset by Claude Code as
routine-executor — see 3.6.

### 3.5 Identity mapping is in the mirror, not in Zoho or Zitadel

A new table in the Leaseweb mirror:

```
chat_user_mapping (
  zitadel_user_id   text primary key,
  email             text unique,
  zoho_module       text,            -- 'Contacts' | 'Aannemers' | null
  zoho_record_id   text,             -- nullable for HQ employees
  employee_id       int references employees(id) nullable,
  role              text,            -- 'klant' | 'aannemer' | 'hq' | 'verkoper'
  created_at        timestamptz default now()
)
```

This is the only place where "Zitadel user X corresponds to Zoho record Y"
is recorded. Zitadel itself stores only auth-relevant data; Zoho stores
business records without auth context.

### 3.6 Ops model: human-owned, Claude-executed

The accountable owner remains a human (Victor today). Claude Code is the
**executor** for routine work and the **first responder** during incidents,
but not the alerting layer. The three rings:

1. **External alerting** (Better Stack / Healthchecks.io) — 24/7 probe of
   health endpoints. Pages a human via SMS/push on failure.
2. **Scheduled Claude routines** — daily backup verification, weekly Zitadel
   update checks, monthly restore drills. Reports to a single inbox the human
   reviews.
3. **On-demand investigation** — human invokes Claude with logs/symptoms,
   Claude reasons and acts.

Claude does not run continuously and cannot be the alerting layer. This is
acceptable because the alerting service is cheap (~€15-20/mo) and the
routines plus on-demand work cover the rest. See
[`docs/ops/scheduled-health-checks.md`](../../ops/scheduled-health-checks.md)
and [`docs/ops/zitadel-runbook.md`](../../ops/zitadel-runbook.md).

## 4. Scope

**In scope (this spec):**
- Architectural placement of chat and identity
- Identity-mapping table schema
- Ops model and Claude's role
- Updates to the `/architecture` page reflecting the above

**Out of scope (separate efforts):**
- Building Rocket.Chat into the portals (separate per-portal work)
- Installing Zitadel on Leaseweb (separate ops spec when ready)
- Migrating the existing `employees` table into Zitadel (planned, not designed)
- Decisions on transcript retention, AVG documentation, breach-response playbook
  (separate compliance work)
- Choice of external alerting vendor (TBD before turn-on)
- Choice of SMTP vendor (TBD before turn-on)
- Final hostname for Zitadel (`auth.lab21.nl` is placeholder)

## 5. Trade-offs accepted

- **Single point of failure.** When Zitadel is down, nobody logs in anywhere.
  Mitigated by external alerting + Claude-driven restore drills + the option
  to escalate to a passive standby later.
- **AVG burden moves on-prem.** As soon as we self-host identity, we are the
  data processor of last resort for klant/aannemer credentials. Documentation
  of retention, breach response, and the right-to-be-forgotten flow is now
  required.
- **Identity provider chosen before stress-testing.** Zitadel was picked on
  conceptual fit and operational feel; if a real blocker emerges during
  implementation (e.g. Rocket.Chat OIDC compatibility), the architecture
  allows swapping to Authentik or Keycloak with bounded effort.
- **Chat is a real new service to operate.** Rocket.Chat + Jitsi + Whisper is
  not trivial — it adds its own runbook, backups, and monitoring. The case
  for in-house chat (evidence, sovereignty) was judged strong enough to
  justify this; SaaS alternatives (Intercom, Front) were not seriously
  considered.

## 6. Open items

- Pick external alerting vendor (Better Stack vs Healthchecks.io vs both).
- Pick SMTP vendor for Zitadel (Postmark default).
- Decide final hostname for the identity service.
- Pick the first portal to integrate with Zitadel as proof — likely
  klantenportal for smallest blast radius.
- Decide backup-storage destination (Vercel Blob, Backblaze B2, Leaseweb
  native).
- Backup human for Victor when out of office.
- AVG retention period for failed-login records.
- Whether Claude is allowed to auto-remediate known scenarios (e.g. restart
  crashed container) or always wait for human approval.
