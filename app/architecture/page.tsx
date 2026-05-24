export const dynamic = "force-static";

export const metadata = {
  title: "Architecture — LAB21 Operations",
  description:
    "Stable architecture overview for the LAB21 Operations ecosystem (portals, configurators, orchestrator, Zoho).",
};

export default function ArchitecturePage() {
  return (
    <>
      <h1>LAB21 Operations — Architecture</h1>
      <p style={{ marginBottom: 4 }}>
        Stable architecture overview for the LAB21 ecosystem. This page is the
        canonical reference — read it at the start of any new working session.
      </p>
      <p style={{ color: "var(--muted)", fontSize: 12 }}>
        Last reviewed: 2026-05-24 · Owner: Victor (XCX International) ·
        Decision status: <strong style={{ color: "var(--ok)" }}>locked in</strong>
      </p>

      <h2>TL;DR for AI agents</h2>
      <div className="card" style={{ borderLeft: "4px solid var(--accent)" }}>
        <ol style={{ marginTop: 0, paddingLeft: 20 }}>
          <li>
            <strong>Zoho CRM is the single source of truth (SSOT).</strong>{" "}
            Every app writes to Zoho. Every app listens to Zoho webhooks.
          </li>
          <li>
            <strong>Each app owns its own subdomain logic. LAB21 Operations
            owns the cross-app orchestration logic.</strong>{" "}
            Klantenportal, Aannemersportal, and the configurators each
            contain real business rules for their own subdomain (what a
            klant can choose, how an aannemer schedules a VI, how a
            configurator prices a product). LAB21 Operations owns the rules
            that span apps and would otherwise drift across them — buffer
            rules, leverdatum cascades, status orchestration, multi-party
            workflows.
          </li>
          <li>
            <strong>Every app keeps Zoho access inside one thin file</strong>{" "}
            (<code>src/repo/zoho.ts</code> or equivalent). Future swap of Zoho
            for Postgres edits only that file per app.
          </li>
          <li>
            <strong>Workflow chaining is solved by stateless re-evaluation.</strong>{" "}
            On any Zoho webhook, the orchestrator reads current state, walks
            the decision tree as code, and writes outcomes back. No
            persistent state in the orchestrator.
          </li>
          <li>
            <strong>Portals stay in sync with Zoho via webhooks + polling.</strong>{" "}
            3–5 second polling is good enough for human-paced flows.
          </li>
        </ol>
      </div>

      <h2>System diagram</h2>
      <div className="card">
        <pre
          style={{
            fontFamily: "var(--mono)",
            fontSize: 12,
            lineHeight: 1.4,
            color: "var(--fg)",
            overflowX: "auto",
            margin: 0,
          }}
        >{`
                                            ┌──────────────────────────────┐
                                            │          Zoho CRM            │
                                            │           (SSOT)             │
                                            └─┬──────┬──────────┬────────┬─┘
                                              │      │          │        │
        ┌─────────────────────────────────────┘      │          │        └──────────────────────────────┐
        │ webhook         ┌──────────────────────────┘          │                                       │
        │ "field changed" │ webhook                             │ webhook                       webhook │
        ▼                 ▼                                     ▼                                       ▼
┌──────────────┐  ┌─────────────────────┐            ┌──────────────────┐                  ┌─────────────────┐
│ Klantenport. │  │ Aannemer Management │            │ Lab21 Operations │                  │ Aannemersportal │
│              │  │       Portal        │            │ (decision brain) │                  │                 │
└──────▲───────┘  └──────────▲──────────┘            └─────────┬────────┘                  └────────▲────────┘
       │                     │                                 │                                    │
       │ write intent        │ write intent                    │ write decision outcome             │ write intent
       │                     │                                 │                                    │
       └─────────────────────┴─────────────────────────────────┼────────────────────────────────────┘
                                                               ▼
                                                     (back to Zoho CRM at the top)

 ┌────────────────┐
 │ Configurators  │ ────── write orders/products ──────► Zoho CRM
 │                │ ◄───── webhook on relevant change ──┘
 └────────────────┘
`}</pre>
      </div>

      <h2>Apps and their roles</h2>
      <div className="card">
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th style={th}>App</th>
              <th style={th}>Writes to Zoho</th>
              <th style={th}>Listens to Zoho</th>
              <th style={th}>Repo</th>
            </tr>
          </thead>
          <tbody>
            <tr style={tr}>
              <td style={td}><strong>Klantenportal</strong></td>
              <td style={td}>Klant intents (e.g. choose leverdatum)</td>
              <td style={td}>Fields affecting klant's view</td>
              <td style={td}>
                <a href="https://github.com/Lab21BV/klantenportal">
                  Lab21BV/klantenportal
                </a>
              </td>
            </tr>
            <tr style={tr}>
              <td style={td}><strong>Aannemersportal</strong></td>
              <td style={td}>Aannemer intents (e.g. propose VI date)</td>
              <td style={td}>Fields affecting aannemer's view</td>
              <td style={td}>
                <a href="https://github.com/Lab21BV/aannemers">
                  Lab21BV/aannemers
                </a>{" "}
                <span style={{ color: "var(--muted)", fontSize: 11 }}>
                  (replacing Zoho Creator)
                </span>
              </td>
            </tr>
            <tr style={tr}>
              <td style={td}><strong>Aannemer Management Portal</strong></td>
              <td style={td}>Aannemer-management intents (assignments, onboarding, status changes)</td>
              <td style={td}>Fields affecting aannemer-management view</td>
              <td style={td}>
                <a href="https://github.com/Lab21BV/aannemersmanagement">
                  Lab21BV/aannemersmanagement
                </a>
              </td>
            </tr>
            <tr style={tr}>
              <td style={td}><strong>Configurators</strong></td>
              <td style={td}>New Sales_Orders + line items</td>
              <td style={td}>(Optional) catalog updates</td>
              <td style={td}>
                <a href="https://github.com/Lab21BV/Gordijnen-configurator">
                  Lab21BV/Gordijnen-configurator
                </a>
              </td>
            </tr>
            <tr style={tr}>
              <td style={td}><strong>LAB21 Operations</strong></td>
              <td style={td}>Decision outcomes (statuses, related records, notifications)</td>
              <td style={td}>Everything that triggers a decision</td>
              <td style={td}>this repo (<code>workflows-two</code>)</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>The two non-negotiable refinements</h2>
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

      <h2>Workflow chaining: how it works</h2>
      <div className="card">
        <p style={{ color: "var(--fg)" }}>
          Zoho doesn't refire workflow rules on field updates made by other
          workflow rules. So we move chaining out of Zoho entirely:
        </p>
        <ol style={{ color: "var(--fg)", paddingLeft: 20 }}>
          <li>An app writes a field change to Zoho (intent).</li>
          <li>Zoho fires a webhook to LAB21 Operations.</li>
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
            Each write triggers more webhooks — to other portals (UI updates)
            and back to LAB21 Operations if more chaining is needed.
          </li>
        </ol>
        <p style={{ color: "var(--muted)", marginTop: 8, fontSize: 12 }}>
          No persistent state in LAB21 Operations. "Where we are in the flow"
          is encoded in Zoho field values (e.g.{" "}
          <code>VI_Voorstel_Status = awaiting_klant_leverdatum</code>).
        </p>
      </div>

      <h2>
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
          For Zoho webhooks to actually work for the portals, each portal
          needs a local read store it can serve pages from. Hitting Zoho
          on every page load is not viable — API rate limits, latency, and
          query expressiveness all push against it. The answer is a second
          database hosted in Leaseweb that mirrors the relevant Zoho data
          (a <em>spiegeling</em> of Zoho).
        </p>
        <p style={{ color: "var(--fg)" }}>How it flows:</p>
        <ol style={{ color: "var(--fg)", paddingLeft: 20 }}>
          <li>
            Zoho fires a webhook on a field change (the same webhook that
            already feeds LAB21 Operations).
          </li>
          <li>
            The webhook also updates the Leaseweb mirror DB so it stays in
            sync with Zoho field-by-field.
          </li>
          <li>
            Portals read from the Leaseweb mirror (fast, no Zoho rate
            limits) and write intents back to Zoho via their thin{" "}
            <code>src/repo/zoho.ts</code> wall.
          </li>
          <li>
            Reconciliation crons in LAB21 Operations catch any missed
            webhooks and re-sync the mirror from Zoho periodically.
          </li>
        </ol>
        <p style={{ color: "var(--muted)", marginTop: 8, fontSize: 12 }}>
          Zoho remains the single source of truth. The Leaseweb mirror is
          a read-optimized projection — never the authority. Portals never
          write to it directly; all writes still go through Zoho, and the
          mirror catches up via webhook + reconciliation.
        </p>
        <p style={{ color: "var(--muted)", marginTop: 8, fontSize: 12 }}>
          This is also the natural staging point for the future
          Zoho-to-Postgres swap: once the mirror is the de-facto read
          source and Zoho's role narrows to write-target, replacing Zoho
          with the mirror itself becomes a much smaller step.
        </p>
      </div>

      <h2>How portals push updates to the user's browser</h2>
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

      <h2>Trade-offs we accepted</h2>
      <div className="card">
        <ul style={{ color: "var(--fg)", paddingLeft: 20, marginTop: 0 }}>
          <li>
            <strong>Webhook latency.</strong> Typically &lt;1s, sometimes a
            few seconds during Zoho load spikes. Acceptable for human-paced
            flows. If you ever need instant feedback, the affected portal
            should call LAB21 Operations directly (HTTP) instead of routing
            via Zoho.
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
        </ul>
      </div>

      <h2>Future: replacing Zoho with Postgres</h2>
      <div className="card">
        <p style={{ color: "var(--fg)" }}>
          The architecture is designed to make this swap bounded:
        </p>
        <ol style={{ color: "var(--fg)", paddingLeft: 20 }}>
          <li>Stand up Postgres alongside Zoho.</li>
          <li>
            Replace each app's <code>src/repo/zoho.ts</code> with{" "}
            <code>src/repo/db.ts</code>. Same function signatures, different
            backing store.
          </li>
          <li>
            Replace Zoho webhooks with database triggers / NOTIFY / change
            data capture into the same webhook endpoints.
          </li>
          <li>
            Decision trees, API endpoints, UI code all stay unchanged.
          </li>
        </ol>
      </div>

      <h2>Where new design docs go</h2>
      <div className="card">
        <p style={{ color: "var(--fg)" }}>
          Per-feature design docs (e.g., the VI-reschedule flow we're
          designing now) live in{" "}
          <code>docs/superpowers/specs/YYYY-MM-DD-&lt;topic&gt;-design.md</code>{" "}
          in this repo. They reference this page for shared architectural
          decisions instead of repeating them.
        </p>
      </div>
    </>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 8px 8px 0",
  color: "var(--muted)",
  fontWeight: 600,
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: 0.05,
};
const tr: React.CSSProperties = {
  borderBottom: "1px solid var(--border)",
};
const td: React.CSSProperties = {
  padding: "10px 8px 10px 0",
  verticalAlign: "top",
  color: "var(--fg)",
};
