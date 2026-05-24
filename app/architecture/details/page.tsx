export const dynamic = "force-static";

export const metadata = {
  title: "Architecture details — LAB21 Operations",
  description:
    "Detailed architecture decisions for the LAB21 Operations ecosystem: refinements, workflow chaining, the Leaseweb mirror, eventual consistency, trade-offs, and the King-throughput end state.",
};

export default function ArchitectureDetailsPage() {
  return (
    <>
      <p style={{ marginBottom: 8 }}>
        <a href="/architecture">← Architecture overview</a>
      </p>
      <h1>LAB21 Operations — Architecture details</h1>
      <p style={{ marginBottom: 4 }}>
        Detailed decisions and operational notes. Read the{" "}
        <a href="/architecture">overview</a> first for the diagram, the
        glossary, and the apps table. This page goes deeper on how the
        pieces actually work together.
      </p>
      <p style={{ color: "var(--muted)", fontSize: 12 }}>
        Last reviewed: 2026-05-24 · Owner: Victor (XCX International) ·
        Decision status:{" "}
        <strong>evolving</strong> — Leaseweb mirror DB to be built; some
        operational details are still open.
      </p>

      <h2 id="the-two-non-negotiable-refinements">The two non-negotiable refinements</h2>
      <div className="grid">
        <div className="card">
          <strong style={{ color: "var(--accent)" }}>
            1. Thin Zoho wall in every app
          </strong>
          <p style={{ color: "var(--fg)", marginTop: 8 }}>
            All Zoho calls live in one file per app, e.g.{" "}
            <code>src/repo/zoho.ts</code>. Nothing else imports{" "}
            <code>ZohoClient</code> directly.
          </p>
          <p style={{ color: "var(--muted)", marginTop: 8, fontSize: 12 }}>
            Why: future Zoho-to-Postgres swap edits one file per app instead
            of the whole codebase.
          </p>
        </div>
        <div className="card">
          <strong style={{ color: "var(--accent) " }}>
            2. Cross-app rules in ONE place
          </strong>
          <p style={{ color: "var(--fg)", marginTop: 8 }}>
            Cross-app decision logic — buffer rules, leverdatum cascades,
            multi-party status orchestration, validations that span more
            than one app — lives only in LAB21 Operations. Each portal and
            configurator still owns the business rules for its own
            subdomain.
          </p>
          <p style={{ color: "var(--muted)", marginTop: 8, fontSize: 12 }}>
            Why: rules that touch multiple apps must live in one place to
            avoid drift. Rules that only touch one subdomain belong in that
            app, where the team owning it can iterate without touching the
            orchestrator.
          </p>
        </div>
      </div>

      <h2 id="workflow-chaining-how-it-works">Workflow chaining: how it works</h2>
      <div className="card">
        <p style={{ color: "var(--fg)" }}>
          Zoho doesn't refire workflow rules on field updates made by other
          workflow rules. So we move chaining out of Zoho entirely:
        </p>
        <ol style={{ color: "var(--fg)", paddingLeft: 20 }}>
          <li>An app writes a field change to Zoho (intent).</li>
          <li>
            Zoho fires a webhook. The same stream fans out to{" "}
            <strong>LAB21 Operations</strong> (decision brain) and the{" "}
            <strong>mirror-sync handler</strong> (read-side projection);
            configurators receive their own webhook stream for catalog
            updates.
          </li>
          <li>
            LAB21 Operations reads the full current state from Zoho (record +
            related records + lookups).
          </li>
          <li>
            It walks the decision tree as a pure function and produces a list
            of next actions.
          </li>
          <li>It writes those outcomes back to Zoho.</li>
          <li>
            Each write triggers more webhooks — into the Leaseweb mirror DB
            (which surfaces to portal UIs) and back to LAB21 Operations if
            more chaining is needed.
          </li>
        </ol>
        <p style={{ color: "var(--fg)", marginTop: 12 }}>
          <strong>Hard constraint: LAB21 Operations reads from Zoho
          directly, never from the Leaseweb mirror.</strong> The
          orchestrator must see the same state Zoho saw when it fired the
          webhook; the mirror lags and is for portal reads only. Reading
          the mirror would break re-evaluation guarantees.
        </p>
        <p style={{ color: "var(--fg)", marginTop: 8 }}>
          <strong>Idempotency requirement:</strong> the decision tree must
          be idempotent. Zoho can fire duplicate webhooks, the
          orchestrator may re-evaluate after its own writes, and
          reconciliation can replay events. Re-applying the same outcome
          must be a no-op. In practice: write conditionally (skip if the
          value already matches), use status-transition guards, never
          blindly append to lists or counters.
        </p>
        <p style={{ color: "var(--muted)", marginTop: 8, fontSize: 12 }}>
          No persistent state in LAB21 Operations. "Where we are in the flow"
          is encoded in Zoho field values (e.g.{" "}
          <code>VI_Voorstel_Status = awaiting_klant_leverdatum</code>).
        </p>
      </div>

      <h2 id="orchestrator-data-contract">Orchestrator data contract &amp; decision log</h2>
      <div className="card">
        <p style={{ color: "var(--fg)" }}>
          The decision brain is called a "pure function" elsewhere in
          this doc. That's only enforceable if it has a typed
          contract. Without one, the claim is folklore. The contract:
        </p>
        <pre
          style={{
            fontFamily: "var(--mono)",
            fontSize: 12,
            lineHeight: 1.45,
            color: "var(--fg)",
            overflowX: "auto",
            marginTop: 0,
            marginBottom: 0,
            padding: 12,
            background: "var(--card-bg, transparent)",
            border: "1px solid var(--border)",
            borderRadius: 4,
          }}
        >{`type DecisionInput = {
  trigger: { module: string; recordId: string; reason: WebhookReason };
  record: ModuleRecord;            // versioned schema for that module
  related: Record<string, ModuleRecord[]>; // lookups + related records
  refData: { productLevertijd: Map<ProductId, Days>; ... };
  contractVersion: string;         // bumps with breaking changes
};

type DecisionOutput = {
  writes: Array<{
    target: { module: string; recordId: string };
    field: string;
    newValue: unknown;
    condition?: { field: string; equals: unknown }; // for idempotent writes
  }>;
  tasks: Array<{ kind: string; payload: unknown }>; // todo/notifications
  notes: string[];                                  // for tijdlijn / debugging
};`}</pre>
        <p style={{ color: "var(--fg)", marginTop: 12 }}>
          Why bother with the contract:
        </p>
        <ul style={{ color: "var(--fg)", paddingLeft: 20 }}>
          <li>
            The decision tree becomes <strong>unit-testable in
            isolation</strong> — feed it a fixture, assert on the
            output. No Zoho mocks required.
          </li>
          <li>
            <strong>Idempotency is enforceable at the type level</strong>{" "}
            via the optional <code>condition</code> field on writes —
            most writes should have one.
          </li>
          <li>
            <strong>Contract version</strong> lets you evolve the
            input shape without breaking running orchestrations.
          </li>
        </ul>
        <p style={{ color: "var(--fg)", marginTop: 12 }}>
          <strong>Decision log.</strong> Every invocation of the
          decision brain should append one row to a{" "}
          <code>decision_log</code> table (in the mirror or a separate
          ops schema):
        </p>
        <ul style={{ color: "var(--fg)", paddingLeft: 20 }}>
          <li><code>id</code>, <code>at</code></li>
          <li><code>trigger</code> (module + recordId + reason)</li>
          <li><code>input_hash</code> (deterministic hash of <code>DecisionInput</code>)</li>
          <li><code>contract_version</code></li>
          <li><code>decision_version</code> (git SHA or release tag of the code that ran)</li>
          <li><code>output</code> (the <code>DecisionOutput</code>, serialized)</li>
          <li><code>duration_ms</code></li>
        </ul>
        <p style={{ color: "var(--muted)", marginTop: 8, fontSize: 12 }}>
          Decision log is <em>not</em> the same as tijdlijn. Tijdlijn
          records <em>what changed on a record</em>; the decision log
          records <em>why the orchestrator did what it did</em>. Both
          are needed; both have different retention requirements (see
          "Audit trail" below).
        </p>
      </div>

      <h2 id="portal-read-store-leaseweb-mirror-db-to-be-built">
        Portal read store: Leaseweb mirror DB{" "}
        <span
          style={{
            fontSize: 11,
            color: "var(--muted)",
            fontWeight: 400,
            letterSpacing: 0.05,
            textTransform: "uppercase",
          }}
        >
          (to be built)
        </span>
      </h2>
      <div className="card">
        <p style={{ color: "var(--fg)" }}>
          For Zoho webhooks to actually work for the portals, the portals
          need a read store they can serve pages from. Hitting Zoho on
          every page load is not viable — API rate limits, latency, and
          query expressiveness all push against it. The answer is a
          second database hosted in Leaseweb that mirrors the relevant
          Zoho data (a <em>spiegeling</em> of Zoho).
        </p>
        <p style={{ color: "var(--fg)" }}>
          <strong>Topology — open for revisit before build.</strong> The
          initial sketch was one Postgres cluster with a{" "}
          <em>separate schema per portal</em>{" "}
          (<code>klant</code>, <code>aannemer</code>,{" "}
          <code>aannemermgmt</code>), each portal connecting to its own
          schema only. The data-architect review flagged a problem: LAB21
          flows are inherently <strong>cross-actor</strong>. Klant data
          is read by aannemer flows during a voorinspectie; aannemer
          scheduling is read by the klant view; aannemer-management
          staff see both. Separate schemas force either duplication
          (a 3-way consistency problem inside the mirror) or
          cross-schema reads (which the isolation rule forbids).
        </p>
        <p style={{ color: "var(--fg)" }}>
          <strong>Recommended path (to confirm before building):</strong>{" "}
          one shared cluster, <strong>one schema</strong>, with{" "}
          <strong>Postgres row-level security (RLS)</strong> scoped per
          portal role. Each portal connects with its own DB role; RLS
          policies restrict which rows it can see. This gives genuine
          isolation (no app sees rows it shouldn't), keeps shared
          lookups cheap (no duplication of klant/aannemer master data),
          and avoids the cross-schema read trap entirely. Schema
          evolution stays unified, which simplifies the sync handler.
          Decision pending Victor's confirmation; until then, the build
          should not commit to either topology.
        </p>
        <p style={{ color: "var(--fg)" }}>
          <strong>Mandatory row metadata.</strong> Every mirrored row
          carries lineage columns the sync handler populates and
          business logic ignores:
        </p>
        <ul style={{ color: "var(--fg)", paddingLeft: 20 }}>
          <li><code>_zoho_id</code> — origin record ID in Zoho.</li>
          <li>
            <code>_zoho_modified_at</code> — Zoho's{" "}
            <code>Modified_Time</code> at the moment of sync (lets us
            order events and detect out-of-order webhooks).
          </li>
          <li>
            <code>_mirror_synced_at</code> — when the mirror wrote this
            row (the gap to <code>_zoho_modified_at</code> is the
            actual measured sync latency).
          </li>
          <li>
            <code>_source</code> — <code>webhook</code> |{" "}
            <code>reconciliation</code> | <code>manual</code>. Tells
            you whether this row landed via the fast path or the
            backstop.
          </li>
          <li>
            <code>_payload_version</code> — the webhook payload contract
            version used. Becomes critical the first time Zoho changes
            payload shape.
          </li>
        </ul>
        <p style={{ color: "var(--muted)", marginTop: 8, fontSize: 12 }}>
          Why: when the mirror disagrees with reality, these columns
          are the difference between five-minute debugging and
          five-hour debugging. They cost ~32 bytes per row and pay for
          themselves on the first incident.
        </p>

        <p style={{ color: "var(--fg)" }}>
          <strong>The mirror-sync handler</strong> is a first-class piece
          of infrastructure (hosted inside LAB21 Operations as a route
          handler, separate from the decision-brain routes). It receives
          the Zoho webhook stream, translates field changes into mirror
          writes, and is responsible for idempotency, ordering, and
          retries.
        </p>
        <p style={{ color: "var(--fg)" }}>How it flows:</p>
        <ol style={{ color: "var(--fg)", paddingLeft: 20 }}>
          <li>
            Zoho fires a webhook on a field change. The same webhook
            stream feeds two destinations: LAB21 Operations' decision
            brain <em>and</em> the mirror-sync handler.
          </li>
          <li>
            The mirror-sync handler translates the payload into writes
            against the appropriate per-portal schemas in the Leaseweb
            mirror. Writes are idempotent (re-applying the same payload
            is a no-op).
          </li>
          <li>
            Portals read from their own schema in the Leaseweb mirror
            (fast, no Zoho rate limits) and write intents + subdomain
            decision outcomes back to Zoho via their thin{" "}
            <code>src/repo/zoho.ts</code> wall.
          </li>
          <li>
            Reconciliation crons in LAB21 Operations catch any missed
            webhooks and re-sync each portal's schema from Zoho
            periodically.
          </li>
        </ol>
        <p style={{ color: "var(--fg)", marginTop: 12 }}>
          <strong>Zoho webhooks are not change-data-capture.</strong>{" "}
          They fire on conditions defined by Zoho workflow rules — a
          curated subset of field changes the team has configured per
          module — not on every field update. Implications worth
          designing for up front:
        </p>
        <ul style={{ color: "var(--fg)", paddingLeft: 20 }}>
          <li>
            Updates to fields <em>not</em> covered by a workflow rule
            never fire a webhook; the mirror drifts silently between
            reconciliation runs. There is no warning signal — it just
            quietly disagrees with Zoho.
          </li>
          <li>
            Adding a new field in Zoho is a three-place change: the
            Zoho workflow rule, the mirror-sync handler's field
            mapping, and the mirror schema. Drift across these three
            is the most likely failure mode.
          </li>
          <li>
            Reconciliation can't just check{" "}
            <code>Modified_Time &gt; last_sync</code> — that catches
            "row was touched" but not which fields changed. For each
            module, the reconciliation pass should hash the watched
            field set per row and compare to the mirror's hash.
            Cheap on small/medium modules; partitioned for larger ones.
          </li>
        </ul>
        <p style={{ color: "var(--fg)", marginTop: 8 }}>
          The source of truth for "what changes propagate to the
          mirror" is the <strong>union</strong> of (Zoho workflow rules
          configured) and (reconciliation cron scope) — not the webhook
          stream alone. Treat the two as one combined contract.
        </p>
        <p style={{ color: "var(--muted)", marginTop: 12, fontSize: 12 }}>
          Zoho remains the single source of truth. The Leaseweb mirror is
          a read-optimized projection — never the authority. Portals never
          write to it directly; all writes still go through Zoho, and the
          mirror catches up via webhook + reconciliation.
        </p>
        <p style={{ color: "var(--muted)", marginTop: 8, fontSize: 12 }}>
          The Leaseweb mirror is also the actual destination of the
          future Postgres migration — not a stepping stone to some other
          Postgres. Once the mirror is reliable, it gets promoted to
          authoritative, and Zoho's role narrows to a King-sync conduit.
          See the <em>"Future end state"</em> section below for the full
          migration path.
        </p>
        <p style={{ color: "var(--fg)", marginTop: 12 }}>
          <strong>Reference data vs transactional data.</strong> Not
          every mirrored entity has the same replication profile:
        </p>
        <ul style={{ color: "var(--fg)", paddingLeft: 20 }}>
          <li>
            <strong>Reference / master data</strong> — Products,
            Catalog, Aannemers (relatively stable identity records),
            Tijdblok templates. Small, slowly-changing, queried
            often. Strategy: full replication on every webhook,
            in-memory cache in portals/configurators with short TTL
            and webhook-driven invalidation.
          </li>
          <li>
            <strong>Transactional data</strong> — Sales_Orders,
            Voorinspecties, Tasks, Tijdlijn entries. Grow
            unboundedly, queried by recency or by foreign key.
            Strategy: incremental sync, partition by month or year,
            retention/archival policy required (see Open operational
            items).
          </li>
        </ul>
        <p style={{ color: "var(--muted)", marginTop: 8, fontSize: 12 }}>
          One-size-fits-all replication will hurt at 1–3 years.
          Naming the split now lets each entity opt into the right
          pattern from day one.
        </p>

        <p style={{ color: "var(--fg)", marginTop: 16 }}>
          <strong>Configurators' catalog flow (clarification).</strong>{" "}
          The apps table lists configurators' Zoho-listen role as
          "(Optional) catalog updates." Specifying it more concretely:
        </p>
        <ul style={{ color: "var(--fg)", paddingLeft: 20 }}>
          <li>
            "The catalog" is almost certainly <em>not one thing</em>{" "}
            — at minimum it spans <code>Products</code> (with
            <code>Levertijd</code>, base price), price lists / kortingen,
            configurable option ranges, and possibly fabric / material
            libraries per configurator. Each may evolve at its own
            cadence. Treat the catalog as a <strong>set of named
            reference scopes</strong>, not a single blob.
          </li>
          <li>
            Configurators read each scope via a Zoho webhook → local
            cache (per configurator instance or a shared edge cache).
            Not via the Leaseweb mirror — the mirror is for portal
            read-paths, not for configurator-style externally-hosted
            apps.
          </li>
          <li>
            Every Sales_Order written back to Zoho stamps a{" "}
            <code>catalog_versions</code> map (e.g.{" "}
            <code>{`{ products: "2026-05-24T10:00", prices: "2026-05-20T09:00", fabrics: "2026-04-12T14:00" }`}</code>).
            If a scope changes mid-session, the order carries the
            versions it was built against — King and downstream
            consumers can detect drift and recompute if needed.
          </li>
          <li>
            <strong>Open: which scopes exist exactly</strong> per
            configurator (gordijnen, future configurators). Worth
            enumerating before the second configurator ships, while
            the pattern is still cheap to change.
          </li>
        </ul>

        <p style={{ color: "var(--fg)", marginTop: 16 }}>
          <strong>Webhook payload schema validation at ingress.</strong>{" "}
          The webhook payload is owned by Zoho (a vendor); it can
          change without warning. The mirror-sync handler must:
        </p>
        <ul style={{ color: "var(--fg)", paddingLeft: 20 }}>
          <li>
            Parse the payload with a typed validator (zod, valibot,
            or equivalent). Reject loudly on missing required
            fields; <em>tolerate</em> unknown new fields.
          </li>
          <li>
            Snapshot the raw payload to cold storage (object store
            with a short TTL) before processing — if a parser bug
            eats data, you can replay from the snapshot.
          </li>
          <li>
            Stamp <code>_payload_version</code> on the mirror row
            (see "Mandatory row metadata"). Future schema changes
            become detectable and migratable, not invisible.
          </li>
        </ul>

        <p style={{ color: "var(--muted)", marginTop: 12, fontSize: 12 }}>
          (The full read/write topology is in the <em>System diagram</em>{" "}
          on the <a href="/architecture">overview page</a> — no need to
          repeat it here.)
        </p>
      </div>

      <h2 id="how-portals-push-updates-to-the-users-browser">How portals push updates to the user's browser</h2>
      <div className="card">
        <p style={{ color: "var(--fg)" }}>
          With the Leaseweb mirror DB carrying the read state, the question
          "how does the user's browser learn about an update" cleanly
          separates from "how does the mirror learn about an update." The
          mirror catches up via Zoho webhook + reconciliation cron (see the
          section above). What's left is the portal-to-browser hop. Three
          options, simplest first:
        </p>
        <ul style={{ color: "var(--fg)", paddingLeft: 20 }}>
          <li>
            <strong>Polling (default).</strong> Browser asks the portal
            "any change?" every 3–5 seconds; the portal answers by reading
            from the Leaseweb mirror. Good enough for all current
            human-paced flows.
          </li>
          <li>
            <strong>Server-Sent Events (SSE), backed by Postgres
            LISTEN/NOTIFY.</strong> When the webhook handler updates the
            mirror, Postgres fires a <code>NOTIFY</code>; the portal's SSE
            stream picks it up and pushes to open browser tabs in real
            time. Cheap to add later because it runs on the same DB the
            portal already reads from — no extra fan-out infrastructure.
          </li>
          <li>
            <strong>WebSockets.</strong> Bi-directional. Overkill for these
            read-mostly flows.
          </li>
        </ul>
      </div>

      <h2 id="audit-trail-tijdlijn-and-decision-log">Audit trail: tijdlijn &amp; decision log</h2>
      <div className="card">
        <p style={{ color: "var(--fg)" }}>
          Two distinct audit streams, often confused. Both are
          first-class for compliance, debugging, and customer support
          — name them now, before they grow organically and
          inconsistently.
        </p>
        <p style={{ color: "var(--fg)" }}>
          <strong>Tijdlijn — per-record event timeline.</strong>{" "}
          Append-only log of field changes per business record
          (Voorinspectie, Sales_Order, etc.). Answers "what happened
          to this record." Owned by LAB21 Operations and written when
          decisions are committed, or by the portal when a user
          action lands. Decisions on:
        </p>
        <ul style={{ color: "var(--fg)", paddingLeft: 20 }}>
          <li>
            <strong>Storage:</strong> own table in the mirror
            (<code>tijdlijn</code>), partitioned by year. Not a Zoho
            module — too noisy, too many rows, wrong tool.
          </li>
          <li>
            <strong>Write semantics:</strong> append-only, no
            updates, no deletes (except via the GDPR redaction
            path).
          </li>
          <li>
            <strong>Retention (proposed — confirm with compliance):</strong>{" "}
            ~7 years for financial-impact records (Dutch tax law
            requires 7 years for invoices and order records);
            ~2 years for non-financial operational entries. PII
            columns redacted on klant-erasure but the entry itself
            stays for legal traceability. These numbers are{" "}
            <em>not legal advice</em> — confirm with whoever owns
            compliance before they go into a migration.
          </li>
        </ul>
        <p style={{ color: "var(--fg)", marginTop: 8 }}>
          <strong>Decision log — per-orchestration-invocation.</strong>{" "}
          Defined above in the orchestrator-contract section. Answers
          "why did the brain do what it did." Different shape,
          different retention:
        </p>
        <ul style={{ color: "var(--fg)", paddingLeft: 20 }}>
          <li>
            <strong>Storage:</strong> own table (or schema) in the
            mirror, partitioned by month.
          </li>
          <li>
            <strong>Retention:</strong> 90 days hot, 1 year cold.
            Long-tail value drops fast — these are for debugging,
            not legal traceability.
          </li>
          <li>
            <strong>PII handling:</strong> store the{" "}
            <code>input_hash</code> always; store the full input only
            for failed invocations or sampled successes (privacy +
            volume).
          </li>
        </ul>
        <p style={{ color: "var(--muted)", marginTop: 8, fontSize: 12 }}>
          Rule of thumb: tijdlijn is what the business asks about
          ("when did this order's status change?"); decision log is
          what engineers ask about ("why did the system pick branch
          B?").
        </p>
      </div>

      <h2 id="eventual-consistency-read-your-writes">Eventual consistency: read-your-writes</h2>
      <div className="card">
        <p style={{ color: "var(--fg)" }}>
          Writes go to Zoho directly; reads come back via Zoho → webhook
          → Mirror-Sync Handler → Leaseweb mirror → portal poll. The
          full round-trip is <em>estimated</em> at{" "}
          <strong>3–6 seconds</strong> typical and{" "}
          <strong>10+ seconds</strong> during Zoho load spikes — these
          numbers are targets to validate once the mirror is in
          production, not measured facts. Fine for most flows, but
          they create a real foot-gun: a user can write field 1 and
          then write field 2 fast enough that the portal still sees
          stale state when validating the second write.
        </p>
        <p style={{ color: "var(--fg)" }}>
          <strong>Where it's fine</strong> (no extra work needed):
        </p>
        <ul style={{ color: "var(--fg)", paddingLeft: 20 }}>
          <li>
            Two dependent fields on the <em>same form</em>: validate
            client-side from the in-memory form state. The portal
            already knows field 1's new value — no need to round-trip
            the mirror.
          </li>
          <li>
            Multi-step flows where field 2 lives on a different page
            reached by navigation: by the time the user clicks through
            (~5 s), the mirror has caught up and the next page fetches
            fresh.
          </li>
        </ul>
        <p style={{ color: "var(--fg)" }}>
          <strong>Where it hurts</strong> (needs a mitigation):
        </p>
        <ul style={{ color: "var(--fg)", paddingLeft: 20 }}>
          <li>
            Field 1 in portal A drives a condition on field 2 in
            portal B, and the user switches tabs/portals in &lt;5 s.
          </li>
          <li>
            Two users editing related fields in different portals
            concurrently.
          </li>
          <li>
            "I just clicked approve — why doesn't this button unlock
            yet?" The user expects same-session feedback faster than
            the round-trip allows.
          </li>
        </ul>
        <p style={{ color: "var(--fg)" }}>
          <strong>Default mitigations</strong> (combine as needed):
        </p>
        <ol style={{ color: "var(--fg)", paddingLeft: 20 }}>
          <li>
            <strong>Client-side cross-field validation inside a form.</strong>{" "}
            Don't outsource same-form dependencies to the mirror. The
            portal owns its subdomain rules anyway — keep the
            validation where the form lives.
          </li>
          <li>
            <strong>Optimistic UI on write.</strong> When the portal
            writes to Zoho, also update its own local state
            immediately so the user sees the new value without waiting
            for the round-trip. The webhook reconciles a few seconds
            later; on the rare contradiction, the next poll corrects.
          </li>
          <li>
            <strong>Server-side backstop validation in LAB21
            Operations.</strong> The decision brain reads live from
            Zoho (not the mirror), so it sees the current truth.
            Re-validate cross-field invariants there and reject writes
            that are inconsistent. This catches the case where a
            portal accepted bad input based on stale mirror state.
          </li>
        </ol>
        <p style={{ color: "var(--muted)", marginTop: 8, fontSize: 12 }}>
          Escape hatch (only if needed): for a genuine cross-portal
          real-time flow, a "read-your-writes" header — a write-token
          returned on write, passed on subsequent reads, with the read
          endpoint waiting up to N ms for the mirror to reflect that
          token — works but is overkill for most cases. Don't reach
          for it until a specific flow demands it.
        </p>
      </div>

      <h2 id="data-classification-and-gdpr">Data classification &amp; GDPR</h2>
      <div className="card">
        <p style={{ color: "var(--fg)" }}>
          The mirror replicates personal data: klant names, addresses,
          contact details, plus aannemer business/personal data. With
          three portals, the orchestrator, the mirror, and downstream
          King, LAB21 already touches data that GDPR cares about.
          These decisions need to land before live klant data lands in
          the mirror — bolting GDPR on later is meaningfully harder
          than designing for it now.
        </p>
        <ul style={{ color: "var(--fg)", paddingLeft: 20 }}>
          <li>
            <strong>Classification.</strong> Mark PII columns in the
            mirror schema explicitly — a column comment, a tag in the
            migration file, or a registry table. At minimum: klant{" "}
            <em>persoonsgegevens</em>, aannemer contact details, and
            financial fields. Untagged-by-default = "not PII"; tagging
            is a deliberate act.
          </li>
          <li>
            <strong>Residency.</strong> Leaseweb (NL) for the mirror
            is intentional, not incidental — EU residency for EU
            klanten. Document Zoho's regional instance and any
            cross-border data flows (Zoho region → King) so the
            posture is auditable.
          </li>
          <li>
            <strong>Right to erasure.</strong> When a klant requests
            deletion, the chain is: Zoho record → mirror row → portal
            caches → tijdlijn (audit) → King's downstream copy. A
            single "delete klant X" operation needs to fan out to all
            of these, or each retention exception (financial records
            under Dutch law, etc.) needs to be named in code.
          </li>
          <li>
            <strong>Retention.</strong> How long do mirrored PII rows
            persist after the Zoho record is deleted? Default:
            hard-delete in the mirror within hours of the Zoho delete,
            via the same webhook path. Audit log retains for the legal
            minimum but with PII columns redacted.
          </li>
          <li>
            <strong>Access logging.</strong> Postgres logs alone are
            not enough. PII column reads need a row-level audit
            (which DB role read which row when). Postgres roles + RLS
            (see Mirror DB topology above) make this practical.
          </li>
          <li>
            <strong>Encryption.</strong> TLS in transit between Zoho,
            the sync handler, the mirror, and the portals (table
            stakes). Decide explicitly whether PII columns are also
            encrypted at rest at the column level, or whether
            disk-level encryption + access controls are sufficient.
          </li>
        </ul>
        <p style={{ color: "var(--muted)", marginTop: 8, fontSize: 12 }}>
          None of this needs to be perfect at v1. But the boundary
          must be designed before live klant data lands in the mirror,
          and the design must survive an audit, not just a code
          review.
        </p>
      </div>

      <h2 id="trade-offs-we-accepted">Trade-offs we accepted</h2>
      <div className="card">
        <ul style={{ color: "var(--fg)", paddingLeft: 20, marginTop: 0 }}>
          <li>
            <strong>Webhook latency vs full round-trip.</strong> A single
            webhook hop is typically &lt;1 s, sometimes a few seconds
            during Zoho load spikes. The <em>full write→read round-trip</em>{" "}
            (portal write → Zoho → webhook → mirror-sync → mirror → portal
            poll) is typically 3–6 s, occasionally 10+ s. Acceptable for
            human-paced flows. For sub-second perceived feedback, use the
            patterns in <em>"Eventual consistency: read-your-writes"</em>{" "}
            (optimistic UI on write, client-side cross-field validation,
            server-side backstop in LAB21 Operations). Do <strong>not</strong>{" "}
            bypass Zoho by calling LAB21 Operations directly — that
            breaks the SSOT.
          </li>
          <li>
            <strong>Webhook reliability.</strong> Zoho webhooks are not
            100%. Mitigation: cron-based reconciliation jobs in LAB21
            Operations (we already use this pattern — see{" "}
            <code>/api/cron/voorinspectie-no-response</code>).
          </li>
          <li>
            <strong>Race conditions on shared fields.</strong> E.g., a
            configurator updates <code>Products.Levertijd</code> while a VI
            reschedule is mid-flight. Mitigation: when a chain depends on a
            value, snapshot it into the originating record at the moment the
            chain starts.
          </li>
          <li>
            <strong>Webhook security.</strong> Zoho webhook endpoints
            must verify a shared secret (header or path token) and treat
            unverified payloads as untrusted. Duplicate webhooks are
            expected — idempotent handlers (above) handle that, but
            obvious replay attacks should be rejected at the edge.
          </li>
          <li>
            <strong>Mirror staleness on sync failure.</strong> If the
            mirror-sync handler errors or a webhook is dropped, the
            mirror drifts from Zoho. Reconciliation cron must run on a
            tight cadence — recommend <strong>every 5–15 minutes per
            module</strong>, incremental by <code>Modified_Time</code>,
            not nightly. Worst-case staleness for portal reads is
            bounded by that cadence plus one reconciliation pass.
          </li>
        </ul>
      </div>

      <h2 id="future-end-state-leaseweb-as-ssot-zoho-as-king-throughput">Future end state: Leaseweb as SSOT, Zoho as King throughput</h2>
      <div className="card">
        <p style={{ color: "var(--fg)" }}>
          Zoho doesn't get fully retired. It has an existing integration
          with <strong>King</strong> (our ERP), and rebuilding that in
          Leaseweb isn't worth the effort. So Zoho's eventual role
          narrows to a single job: receive the King-relevant subset of
          records and let Zoho's existing King sync push them through.
          Everything else — the SSOT, the decision logic, the portal read
          state — moves to Leaseweb Postgres.
        </p>
        <p style={{ color: "var(--fg)" }}>End state:</p>
        <ul style={{ color: "var(--fg)", paddingLeft: 20 }}>
          <li>
            <strong>Leaseweb Postgres is the authoritative store.</strong>{" "}
            All apps read and write Leaseweb directly.
          </li>
          <li>
            <strong>Zoho is a throughput layer for King.</strong> A sync
            job pushes the King-relevant slice from Leaseweb → Zoho
            (sales orders, klantgegevens, invoices, etc.); Zoho's
            existing King integration handles the rest.
          </li>
          <li>
            <strong>Zoho → Leaseweb webhooks disappear.</strong> Leaseweb
            is the source now; cross-app events ride on Postgres triggers
            / <code>NOTIFY</code> / CDC into the same handler endpoints
            we use today.
          </li>
          <li>
            <strong>
              <code>src/repo/zoho.ts</code> in each app becomes{" "}
              <code>src/repo/db.ts</code>
            </strong>{" "}
            — same function signatures, different backing store. Caller
            code unchanged.
          </li>
        </ul>
        <p style={{ color: "var(--fg)" }}>Migration path (incremental):</p>
        <ol style={{ color: "var(--fg)", paddingLeft: 20 }}>
          <li>
            Build the Leaseweb mirror as a read-only projection of Zoho
            (the current step — see section above).
          </li>
          <li>
            Add dual-writes from each app: write to Leaseweb directly
            <em> and</em> keep the Zoho write for now.
          </li>
          <li>
            Flip reads in LAB21 Operations from Zoho to Leaseweb; promote
            Leaseweb to authoritative.
          </li>
          <li>
            Trim Zoho writes to only the King-relevant slice; drop the
            rest.
          </li>
          <li>
            Replace the Zoho → Leaseweb sync with a Leaseweb → Zoho sync
            for the King subset. Zoho's existing King integration is
            untouched throughout.
          </li>
        </ol>
        <p style={{ color: "var(--muted)", marginTop: 8, fontSize: 12 }}>
          Caveat (honesty): "caller code unchanged" is the target, not a
          guarantee. Zoho COQL ≠ SQL, Zoho webhooks ≠ Postgres NOTIFY
          (NOTIFY drops if no listener — needs an outbox pattern), and
          query patterns tuned for ~100ms Zoho calls will probably get
          rewritten for sub-millisecond Postgres calls. The interface
          stays the same; the implementation will need real work.
        </p>
        <p style={{ color: "var(--muted)", marginTop: 8, fontSize: 12 }}>
          Open question: <strong>which records belong to the
          King-relevant slice?</strong> Sales orders, invoices,
          klantgegevens are the obvious yes; partial updates,
          cancellations, refunds, stock reservations, and aannemer-side
          records are not. Define the boundary as code (a single{" "}
          <code>isKingRelevant(record)</code> predicate) so it's
          explicit and testable, not folkloric.
        </p>

        <p style={{ color: "var(--fg)", marginTop: 12 }}>
          <strong>Dual-writes need an outbox.</strong> Migration step
          2 says "write to Leaseweb directly and keep the Zoho write
          for now." That's a dual-write — notoriously divergent
          without help (one succeeds, the other 429s, divergence
          starts). The fix: a <strong>transactional outbox</strong>:
        </p>
        <ul style={{ color: "var(--fg)", paddingLeft: 20 }}>
          <li>
            Each app writes to its primary store (initially Zoho;
            later Leaseweb) inside a transaction that <em>also</em>{" "}
            appends to a local <code>outbox</code> table.
          </li>
          <li>
            A publisher process tails the outbox and writes to the
            secondary store with retries and exponential back-off.
            Idempotent on both ends (using <code>_zoho_id</code> +
            <code>_payload_version</code>).
          </li>
          <li>
            Divergence becomes observable: outbox depth and
            replication lag are metrics, not surprises.
          </li>
        </ul>

        <p style={{ color: "var(--fg)", marginTop: 12 }}>
          <strong>Data-quality gate before promoting Leaseweb.</strong>{" "}
          Migration step 3 ("promote Leaseweb to authoritative") must
          be evidence-based, not vibes-based:
        </p>
        <ul style={{ color: "var(--fg)", paddingLeft: 20 }}>
          <li>
            <strong>Daily reconciliation report</strong>: compare row
            counts and per-row field hashes between Zoho and the
            mirror for every replicated module.
          </li>
          <li>
            <strong>Promotion threshold</strong>: 100% match on
            counts and hashes for <strong>14 consecutive days</strong>,
            zero open inconsistencies on the latest report.
          </li>
          <li>
            <strong>Rollback plan</strong>: a written runbook to
            flip reads back to Zoho if Leaseweb fails post-flip.
            Tested at least once in staging before the real flip.
          </li>
        </ul>

        <p style={{ color: "var(--fg)", marginTop: 12 }}>
          <strong>King-compatible projection layer.</strong> Once
          Leaseweb is SSOT, the records Zoho receives for King must
          conform to King's schema. Don't let King's shape constrain
          Leaseweb's evolution. Instead:
        </p>
        <ul style={{ color: "var(--fg)", paddingLeft: 20 }}>
          <li>
            Define a set of <strong>views or pure functions</strong>{" "}
            on Leaseweb that produce King-shaped records (call this
            the <em>king_projection</em> layer).
          </li>
          <li>
            The Leaseweb → Zoho sync reads <em>only</em> from the
            projection, never from raw tables. Schema changes in
            Leaseweb stay invisible to King unless the projection is
            also changed.
          </li>
          <li>
            The projection is the explicit contract between LAB21
            data and the ERP. Easier to test, easier to evolve, and
            it gives King's owner one stable interface to negotiate
            against.
          </li>
        </ul>
      </div>

      <h2 id="open-operational-items">Open operational items</h2>
      <div className="card">
        <p style={{ color: "var(--fg)" }}>
          Concerns named here but not yet specified. Track and resolve
          as the Leaseweb mirror lands in production:
        </p>
        <ul style={{ color: "var(--fg)", paddingLeft: 20 }}>
          <li>
            <strong>Authentication / identity.</strong> Each portal
            serves different user populations (klanten, aannemers,
            internal staff). Decide: common IdP or per-portal? Identity
            tied to Zoho Contacts/Leads, or stored separately? Session
            storage location? Pick one before the first portal launches
            publicly.
          </li>
          <li>
            <strong>Deployment topology.</strong> LAB21 Operations runs
            on Vercel. Portal hosting (Vercel? Self-hosted on Leaseweb?
            Per portal?), Leaseweb mirror cluster administration, and
            per-repo CI/CD ownership are not yet written down.
          </li>
          <li>
            <strong>Observability.</strong> Where do failed chains,
            sync-handler errors, dropped webhooks, and slow Zoho calls
            surface? Pick a stack (Sentry, Better Stack, Grafana Cloud,
            Vercel logs, etc.) and one consistent logging contract
            across repos.
          </li>
          <li>
            <strong>Secrets management.</strong> Zoho API tokens, DB
            credentials, webhook secrets are needed by multiple repos.
            Define the source-of-truth (e.g., Vercel env vars per
            project plus one shared secrets store for rotation).
          </li>
          <li>
            <strong>Test environments.</strong> Whether each developer
            gets a Zoho sandbox org, whether PRs spin up isolated
            mirrors, and how integration tests run against real or
            simulated webhooks.
          </li>
          <li>
            <strong>Mirror disaster recovery.</strong> Expected rebuild
            time from Zoho via full reconciliation, and acceptable
            RTO/RPO. Inform the reconciliation-cron cadence and the
            mirror's backup policy.
          </li>
          <li>
            <strong>Schema evolution discipline (expand / contract).</strong>{" "}
            Never rename or remove a field in one step. The pattern
            is always: <em>add the new field, dual-write to old and
            new, switch readers, then remove the old.</em> Webhook
            payload handlers tolerate unknown new fields; never
            reject on schema drift. Every schema change in the
            mirror lands as a versioned migration with up + down
            scripts logged in a <code>schema_migrations</code> table.
          </li>
          <li>
            <strong>Capacity numbers — to gather and link.</strong>{" "}
            Order-of-magnitude inputs that drive index strategy,
            partitioning, caching, and retention:
            <ul style={{ paddingLeft: 20, marginTop: 4 }}>
              <li>klanten, aannemers, active sales orders;</li>
              <li>voorinspecties per day at peak;</li>
              <li>Zoho webhooks/hour at peak vs Zoho API quota;</li>
              <li>expected mirror DB size at 1 year and 3 years.</li>
            </ul>
            Without these, every storage and indexing decision is a
            guess. Gather once, link from here.
          </li>
        </ul>
      </div>

      <h2 id="where-new-design-docs-go">Where new design docs go</h2>
      <div className="card">
        <p style={{ color: "var(--fg)" }}>
          Per-feature design docs (e.g., the VI-reschedule flow we're
          designing now) live in{" "}
          <code>docs/superpowers/specs/YYYY-MM-DD-&lt;topic&gt;-design.md</code>{" "}
          in this repo. They reference these pages for shared architectural
          decisions instead of repeating them.
        </p>
      </div>

      <p style={{ marginTop: 24 }}>
        <a href="/architecture">← Back to architecture overview</a>
      </p>
    </>
  );
}
