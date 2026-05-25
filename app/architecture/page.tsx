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
        Last reviewed: 2026-05-25 · Owner: Victor (XCX International) ·
        Decision status:{" "}
        <strong>evolving</strong> — Leaseweb mirror DB to be built; some
        operational details (sync failure handling, deployment topology,
        observability) are still open. Locks back in once the mirror is
        in production.
      </p>

      <h2>The system in one paragraph</h2>
      <div className="card">
        <p style={{ color: "var(--fg)", margin: 0 }}>
          Three layers. <strong>State</strong>: Zoho CRM today, Leaseweb
          Postgres tomorrow. <strong>Orchestration</strong>: LAB21
          Operations (this repo) as the cross-app decision brain.{" "}
          <strong>Presentation</strong>: three portals (klant, aannemer,
          aannemer-management) plus the configurators, each owning its
          subdomain rules. The Mirror-Sync Handler is the bridge from
          state to a read-optimized projection used by the presentation
          layer.
        </p>
      </div>

      <h2>TL;DR for AI agents</h2>
      <div className="card" style={{ borderLeft: "4px solid var(--accent)" }}>
        <ol style={{ marginTop: 0, paddingLeft: 20 }}>
          <li>
            <strong>Zoho CRM is the single source of truth (SSOT).</strong>{" "}
            Every app writes to Zoho. Zoho webhooks fan out to three
            destinations: <strong>LAB21 Operations</strong> (decision
            brain), the <em>mirror-sync handler</em> (which keeps the
            Leaseweb mirror in sync), and the{" "}
            <strong>configurators</strong> (for catalog updates).
            Portals <strong>read from the mirror</strong>, not from Zoho
            directly.
          </li>
          <li>
            <strong>Each app owns its own subdomain logic. LAB21 Operations
            owns the cross-app orchestration logic.</strong>{" "}
            Klantenportal, Aannemersportal, the Aannemer Management Portal,
            and the configurators each contain real business rules for
            their own subdomain (what a klant can choose, how an aannemer
            schedules a VI, how staff manage aannemers, how a configurator
            prices a product). LAB21 Operations owns the rules that span
            apps and would otherwise drift across them — buffer rules,
            leverdatum cascades, status orchestration, multi-party
            workflows.
          </li>
          <li>
            <strong>Every app keeps Zoho access inside one thin file</strong>{" "}
            (<code>src/repo/zoho.ts</code> or equivalent). The end-state
            swap turns this into <code>src/repo/db.ts</code> against
            Leaseweb Postgres — Zoho stays only as the throughput layer
            into King.
          </li>
          <li>
            <strong>Workflow chaining is solved by stateless re-evaluation.</strong>{" "}
            On any Zoho webhook, the orchestrator reads current state, walks
            the decision tree as code, and writes outcomes back. No
            persistent state in the orchestrator.
          </li>
          <li>
            <strong>Portals read from a shared Leaseweb mirror DB that Zoho
            webhooks keep in sync</strong>{" "}
            (mirror is <em>to be built</em>). Browsers stay current by
            polling the portal every 3–5 seconds (or SSE later) — fast
            enough for human-paced flows without hammering Zoho's API.
            Writes still go straight to Zoho.
          </li>
        </ol>
      </div>

      <h2>Glossary</h2>
      <div className="card">
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <tbody>
            <tr style={tr}>
              <td style={{ ...td, width: 180 }}><strong>klant</strong></td>
              <td style={td}>Customer (end-buyer).</td>
            </tr>
            <tr style={tr}>
              <td style={{ ...td, width: 180 }}><strong>aannemer</strong></td>
              <td style={td}>Contractor / installer doing on-site work.</td>
            </tr>
            <tr style={tr}>
              <td style={{ ...td, width: 180 }}><strong>voorinspectie (VI)</strong></td>
              <td style={td}>Pre-installation site inspection performed by an aannemer.</td>
            </tr>
            <tr style={tr}>
              <td style={{ ...td, width: 180 }}><strong>leverdatum</strong></td>
              <td style={td}>Delivery date for an order.</td>
            </tr>
            <tr style={tr}>
              <td style={{ ...td, width: 180 }}><strong>tijdblok</strong></td>
              <td style={td}>Time slot used for VI scheduling.</td>
            </tr>
            <tr style={tr}>
              <td style={{ ...td, width: 180 }}><strong>tijdlijn</strong></td>
              <td style={td}>Per-record event timeline (audit log of decisions and field changes).</td>
            </tr>
            <tr style={tr}>
              <td style={{ ...td, width: 180 }}><strong>spiegeling</strong></td>
              <td style={td}>Dutch for "mirror / reflection" — used here for the Leaseweb mirror DB.</td>
            </tr>
            <tr style={tr}>
              <td style={{ ...td, width: 180 }}><strong>King</strong></td>
              <td style={td}>ERP system that receives sales-relevant data via Zoho's existing integration.</td>
            </tr>
            <tr style={tr}>
              <td style={{ ...td, width: 180 }}><strong>SSOT</strong></td>
              <td style={td}>Single source of truth. Currently Zoho; end state Leaseweb.</td>
            </tr>
          </tbody>
        </table>
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
                              ┌────────────────────────────────────┐
                              │             Zoho CRM               │  ◄──── write intents + decision outcomes
                              │              (SSOT)                │        (from all apps below)
                              └────────┬──────────────────┬────────┘
                                       │ webhook          │ webhook
                                       │ "field changed"  │
                                       ▼                  ▼
                          ┌─────────────────────────┐  ┌──────────────────┐
                          │   Mirror-Sync Handler   │  │ LAB21 Operations │ ─── write decision outcomes ──► Zoho CRM (top)
                          │   (Zoho payload →       │  │ (decision brain) │
                          │    mirror, idempotent)  │  └──────────────────┘
                          └────────────┬────────────┘
                                       │ writes (per-portal schema)
                                       ▼
                          ┌─────────────────────────┐
                          │   Leaseweb Mirror DB    │  ◄──── reconciliation cron
                          │   (1 cluster, schema    │        (LAB21 Operations)
                          │    per portal: klant /  │
                          │    aannemer /           │
                          │    aannemermgmt)        │
                          └────────────┬────────────┘
                                       │ reads (own schema only)
                  ┌────────────────────┼────────────────────┐
                  ▼                    ▼                    ▼
       ┌──────────────┐   ┌─────────────────────┐   ┌─────────────────┐   ┌──────────────┐
       │ Klantenport. │   │ Aannemer Management │   │ Aannemersportal │   │ Configurators│ ◄── webhook on
       │              │   │       Portal        │   │                 │   │              │     catalog updates
       └──────┬───────┘   └──────────┬──────────┘   └────────┬────────┘   └──────┬───────┘     (from Zoho —
              │                      │                       │                   │              not via mirror)
              └─── write intents + decision outcomes ────────┴───── + orders/products ──► Zoho CRM (top)

 Notes:
  • Mirror-Sync Handler and LAB21 Operations are both modules of Lab21BV/workflows
    (same deployment unit, shown as separate boxes to reflect their distinct roles).
  • Configurators sit at the same level as the portals but are event-recorders, not
    intent-recorders: they commit user-built configurations as Sales_Orders, they don't
    compute decisions. They read directly from Zoho (catalog-update webhook), not the mirror.
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
              <td style={td}>Klant intents + subdomain decision outcomes (e.g. choose leverdatum, klant-side validations)</td>
              <td style={td}>Fields affecting klant's view</td>
              <td style={td}>
                <a href="https://github.com/Lab21BV/klantenportal">
                  Lab21BV/klantenportal
                </a>
              </td>
            </tr>
            <tr style={tr}>
              <td style={td}><strong>Aannemersportal</strong></td>
              <td style={td}>Aannemer intents + subdomain decision outcomes (e.g. propose VI date, aannemer scheduling rules)</td>
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
              <td style={td}>Aannemer-management intents + subdomain decision outcomes (assignments, onboarding, status changes)</td>
              <td style={td}>Fields affecting aannemer-management view</td>
              <td style={td}>
                <a href="https://github.com/Lab21BV/aannemersmanagement">
                  Lab21BV/aannemersmanagement
                </a>
              </td>
            </tr>
            <tr style={tr}>
              <td style={td}><strong>Configurators</strong></td>
              <td style={td}>New Sales_Orders + line items <span style={{ color: "var(--muted)", fontSize: 11 }}>(event-style — they commit user-built configurations; they do not emit intents or decisions like the portals)</span></td>
              <td style={td}>(Optional) catalog updates <span style={{ color: "var(--muted)", fontSize: 11 }}>— directly from Zoho, not via the mirror</span></td>
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
              <td style={td}>
                <a href="https://github.com/Lab21BV/workflows">
                  Lab21BV/workflows
                </a>{" "}
                <span style={{ color: "var(--muted)", fontSize: 11 }}>
                  (this repo)
                </span>
              </td>
            </tr>
            <tr style={tr}>
              <td style={td}><strong>Mirror-Sync Handler</strong></td>
              <td style={td}>— (read-side only; writes to Leaseweb, not Zoho)</td>
              <td style={td}>All field-change webhooks → per-portal schemas in the Leaseweb mirror (idempotent, ordered, retried)</td>
              <td style={td}>
                <a href="https://github.com/Lab21BV/workflows">
                  Lab21BV/workflows
                </a>{" "}
                <span style={{ color: "var(--muted)", fontSize: 11 }}>
                  (module of this repo)
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>Canonical entities</h2>
      <div className="card">
        <p style={{ color: "var(--fg)" }}>
          The core business entities, their Zoho module name (where
          known), kind, and key fields seen in the codebase. This is a
          first sketch — a full data dictionary (every field, type,
          nullability, FK, retention class) belongs alongside the
          mirror schema work and is still TBD.
        </p>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th style={th}>Entity</th>
              <th style={th}>Kind</th>
              <th style={th}>Zoho module</th>
              <th style={th}>Key fields / notes</th>
            </tr>
          </thead>
          <tbody>
            <tr style={tr}>
              <td style={td}><strong>Klant</strong></td>
              <td style={td}>Master (PII)</td>
              <td style={td}>Zoho Contacts / Accounts <span style={{ color: "var(--muted)", fontSize: 11 }}>(to confirm exact module)</span></td>
              <td style={td}>Owned by klantenportal flows; read by aannemer + management</td>
            </tr>
            <tr style={tr}>
              <td style={td}><strong>Aannemer</strong></td>
              <td style={td}>Master (PII)</td>
              <td style={td}>Zoho (custom module — name TBD)</td>
              <td style={td}>Owned by Aannemer Management Portal; read by aannemersportal</td>
            </tr>
            <tr style={tr}>
              <td style={td}><strong>Product</strong></td>
              <td style={td}>Master (reference)</td>
              <td style={td}><code>Products</code></td>
              <td style={td}><code>Levertijd</code> (delivery time in days) drives leverdatum cascades</td>
            </tr>
            <tr style={tr}>
              <td style={td}><strong>Sales_Order</strong></td>
              <td style={td}>Transactional</td>
              <td style={td}><code>Sales_Orders</code></td>
              <td style={td}><code>Leverdatum</code>, <code>Product_Details[]</code> (lines). Written by configurators; King-relevant.</td>
            </tr>
            <tr style={tr}>
              <td style={td}><strong>Voorinspectie</strong></td>
              <td style={td}>Transactional</td>
              <td style={td}><code>Voorinspecties</code></td>
              <td style={td}>Central to VI-reschedule. Fields incl. <code>Leverdatum_Origineel</code>, <code>Datum_tijd</code>, <code>VI_Voorstel_Status</code>, <code>VI_Branch_Gekozen</code>, <code>VI_Buffer_Snapshot_Dagen</code>.</td>
            </tr>
            <tr style={tr}>
              <td style={td}><strong>Task</strong></td>
              <td style={td}>Transactional</td>
              <td style={td}><code>Tasks</code></td>
              <td style={td}>Department-scoped todos (<code>Department</code> = accountmanager | inkoop_planning). <code>What_Id</code> ties back to a Voorinspectie.</td>
            </tr>
            <tr style={tr}>
              <td style={td}><strong>Tijdlijn entry</strong></td>
              <td style={td}>Audit (append-only)</td>
              <td style={td}><code>Datums_2</code> today; target: mirror table</td>
              <td style={td}>Per-record event timeline. Fields: <code>Name</code>, <code>Fase</code>, <code>Code</code>, <code>Omschrijving</code>, <code>Voorinspectie</code> (FK), <code>Status_acceptatie</code>.</td>
            </tr>
            <tr style={tr}>
              <td style={td}><strong>Decision-log entry</strong></td>
              <td style={td}>Audit (append-only)</td>
              <td style={td}>Mirror only — does not exist yet</td>
              <td style={td}>One row per orchestrator invocation: trigger, input hash, contract+decision version, output, duration. See details page.</td>
            </tr>
          </tbody>
        </table>
        <p style={{ color: "var(--muted)", marginTop: 8, fontSize: 12 }}>
          Known relationships from the codebase (cardinalities are best
          guesses, confirm before encoding in the mirror schema):
        </p>
        <ul style={{ color: "var(--muted)", fontSize: 12, paddingLeft: 20, marginTop: 4 }}>
          <li>Klant → Sales_Order: 1:N</li>
          <li>Sales_Order → Product: N:M (via <code>Product_Details</code> line items)</li>
          <li>Sales_Order → Voorinspectie: 1:1 typical, 1:N possible</li>
          <li>Voorinspectie → Aannemer: N:1</li>
          <li>Voorinspectie → Tijdlijn entries (<code>Datums_2</code>): 1:N</li>
          <li>Voorinspectie → Task: 1:N (via <code>What_Id</code>)</li>
        </ul>
        <p style={{ color: "var(--muted)", marginTop: 8, fontSize: 12 }}>
          <strong>Open items for the full data dictionary:</strong>{" "}
          confirm the exact Zoho modules for Klant + Aannemer; enumerate
          every replicated field per module with type and nullability;
          mark PII columns explicitly; record the foreign-key direction
          and on-delete behavior per relationship.
        </p>
      </div>

      <h2>Employees &amp; order assignments</h2>
      <div className="card" style={{ borderLeft: "4px solid var(--accent)" }}>
        <p style={{ color: "var(--fg)", marginTop: 0 }}>
          <strong>LAB21 employees do not get Zoho seats.</strong> Sellers,
          accountmanagers, and inkoop &amp; planning staff interact with
          LAB21 exclusively through the custom apps (this app for AMs +
          I&amp;P, the future <em>Lab21adviseurs</em> app for verkopers,
          plus the shared configurators). Their identity lives in a
          <strong> shared Postgres</strong> outside Zoho — same DB cluster
          as the Leaseweb mirror, but a native, app-owned table (not
          synced from Zoho).
        </p>
        <p style={{ color: "var(--fg)" }}>
          <strong>Hierarchy = 1:1 + delegations.</strong> Each verkoper
          has exactly one default accountmanager (<code>employees.manager_id</code>).
          Vacation handoffs and other temporary coverage use a separate{" "}
          <code>delegations</code> table with{" "}
          <code>(from_am, to_am, valid_from, valid_until)</code>. No
          many-to-many on product or vestiging — those are attributes,
          not reporting lines.
        </p>
        <p style={{ color: "var(--fg)" }}>
          <strong>Order → AM is a snapshot.</strong> When a verkoper
          creates an order, the app resolves the effective AM (default
          manager + any active delegation on that date) and writes
          one row to <code>order_assignments(zoho_order_id, verkoper_id,
          accountmanager_id, snapshotted_at)</code>. After that snapshot,
          the order's AM never auto-moves — even if the verkoper switches
          manager later. Zoho's own <code>Accountmanager</code> userlookup
          field on Sales_Orders / Voorinspecties / etc. stays empty (or
          points at an AI-agent system user); the app DB is the source
          of truth for who owns what.
        </p>
        <p style={{ color: "var(--fg)" }}>
          <strong>AI agents on the roadmap.</strong> Long-term the AM role
          is automated by AI agents. The snapshot model + app-owned
          assignment table mean that swap is a substitution of the
          actor, not a schema change.
        </p>
      </div>

      <h2>Read on for the details</h2>
      <div className="card" style={{ borderLeft: "4px solid var(--accent)" }}>
        <p style={{ color: "var(--fg)", marginTop: 0 }}>
          The page you're on covers the <strong>overview</strong>: the
          three layers, the TL;DR, the glossary, the system diagram, and
          the apps table. For the actual architectural decisions —
          refinements, workflow chaining, mirror DB topology, eventual
          consistency, trade-offs, end-state migration, and open
          operational items — see{" "}
          <a href="/architecture/details"><strong>Architecture details →</strong></a>
        </p>
        <ul style={{ color: "var(--fg)", paddingLeft: 20, marginBottom: 0 }}>
          <li><a href="/architecture/details#the-two-non-negotiable-refinements">The two non-negotiable refinements</a></li>
          <li><a href="/architecture/details#workflow-chaining-how-it-works">Workflow chaining: how it works</a> (incl. idempotency + read-from-Zoho constraint)</li>
          <li><a href="/architecture/details#orchestrator-data-contract">Orchestrator data contract &amp; decision log</a></li>
          <li><a href="/architecture/details#portal-read-store-leaseweb-mirror-db-to-be-built">Portal read store: Leaseweb mirror DB</a> (topology + sync handler + reference/transactional split)</li>
          <li><a href="/architecture/details#how-portals-push-updates-to-the-users-browser">How portals push updates to the user's browser</a></li>
          <li><a href="/architecture/details#audit-trail-tijdlijn-and-decision-log">Audit trail: tijdlijn &amp; decision log</a></li>
          <li><a href="/architecture/details#eventual-consistency-read-your-writes">Eventual consistency: read-your-writes</a></li>
          <li><a href="/architecture/details#data-classification-and-gdpr">Data classification &amp; GDPR</a></li>
          <li><a href="/architecture/details#trade-offs-we-accepted">Trade-offs we accepted</a></li>
          <li><a href="/architecture/details#future-end-state-leaseweb-as-ssot-zoho-as-king-throughput">Future end state: Leaseweb as SSOT, Zoho as King throughput</a></li>
          <li><a href="/architecture/details#ai-agents-planned-deferred">AI agents — planned, deferred</a></li>
          <li><a href="/architecture/details#open-operational-items">Open operational items</a></li>
          <li><a href="/architecture/details#where-new-design-docs-go">Where new design docs go</a></li>
        </ul>
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
