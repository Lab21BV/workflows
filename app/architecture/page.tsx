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
            <strong>LAB21 Operations is the only place where business rules
            live.</strong>{" "}
            Portals and configurators are dumb "intent recorders" — they
            should never compute buffer rules, leverdatum cascades, or
            anything else. That logic belongs here.
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
                                  └─┬──────────┬──────────────┬──┘
                                    │          │              │
                  ┌─────────────────┘          │              └────────────────────┐
                  │ webhook                    │ webhook                           │ webhook
                  │ "field changed"            │                                   │
                  ▼                            ▼                                   ▼
          ┌──────────────┐            ┌──────────────────┐                ┌─────────────────┐
          │ Klantenport. │            │ Lab21 Operations │                │ Aannemersportal │
          │              │            │  (decision brain)│                │                 │
          └──────▲───────┘            └─────────┬────────┘                └────────▲────────┘
                 │                              │                                  │
                 │ write intent                 │ write decision outcome           │ write intent
                 │                              │                                  │
                 └──────────────────────────────┼──────────────────────────────────┘
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
              <td style={td}>(future — outside Zoho)</td>
            </tr>
            <tr style={tr}>
              <td style={td}><strong>Aannemersportal</strong></td>
              <td style={td}>Aannemer intents (e.g. propose VI date)</td>
              <td style={td}>Fields affecting aannemer's view</td>
              <td style={td}>(future — replacing Zoho Creator)</td>
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
            2. Business rules in ONE place
          </strong>
          <p style={{ color: "var(--fg)", marginTop: 8 }}>
            Decision logic (buffer rules, cascades, validations beyond
            field-level) lives only in LAB21 Operations. Portals/configurators
            record raw intent.
          </p>
          <p style={{ color: "var(--muted)", marginTop: 8, fontSize: 12 }}>
            Why: rule changes happen in one file, not 3–4 apps with drift
            risk.
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

      <h2>How portals push updates to the user's browser</h2>
      <div className="card">
        <p style={{ color: "var(--fg)" }}>
          When a portal receives a Zoho webhook, the user's open browser tab
          needs to refresh. Three options, simplest first:
        </p>
        <ul style={{ color: "var(--fg)", paddingLeft: 20 }}>
          <li>
            <strong>Polling (default).</strong> Browser asks the portal "any
            change?" every 3–5 seconds. Good enough for all current human-
            paced flows.
          </li>
          <li>
            <strong>Server-Sent Events (SSE).</strong> Server pushes updates
            to browser tabs in real time. Upgrade later if needed.
          </li>
          <li>
            <strong>WebSockets.</strong> Bi-directional. Overkill for these
            flows.
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
