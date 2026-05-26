import { PROCESSES } from "@/src/processes";
import { WORKFLOWS } from "@/src/workflows/registry";
import { MODULES } from "@/src/zoho/modules";
import { ZohoClient } from "@/src/zoho/client";
import {
  PLANNING_REGELS,
  TIJDLIJN_CODES,
  planningRegelsStats,
} from "@/src/data/planning-tijdlijn";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ZohoRule = {
  id: string;
  name: string;
  module?: { api_name?: string };
  status?: { active?: boolean };
  description?: string | null;
};

async function fetchZohoRules(): Promise<{ rules: ZohoRule[]; error: string | null }> {
  try {
    const zoho = new ZohoClient();
    const res = await zoho.request<{ workflow_rules?: ZohoRule[] }>(
      "/settings/automation/workflow_rules",
    );
    return { rules: res.workflow_rules ?? [], error: null };
  } catch (e) {
    return { rules: [], error: (e as Error).message };
  }
}

export default async function WerkingPage() {
  const processes = Object.values(PROCESSES);
  const webhooks = processes.filter((p) => p.kind === "webhook");
  const crons = processes.filter((p) => p.kind === "cron");
  const liveIds = new Set(Object.keys(WORKFLOWS));
  const liveCount = processes.filter((p) => liveIds.has(p.id)).length;

  const moduleCount = Object.keys(MODULES).length;
  const planningStats = planningRegelsStats();
  const { rules: zohoRules, error: zohoError } = await fetchZohoRules();
  const zohoActive = zohoRules.filter((r) => r.status?.active !== false).length;
  const zohoInactive = zohoRules.length - zohoActive;

  const byModule = new Map<string, ZohoRule[]>();
  for (const r of zohoRules) {
    const m = r.module?.api_name ?? "?";
    if (!byModule.has(m)) byModule.set(m, []);
    byModule.get(m)!.push(r);
  }
  const zohoModules = [...byModule.keys()].sort();

  return (
    <>
      <h1>Werking</h1>
      <p>
        Welke processen draaien er voor LAB21 — en wáár. Twee bronnen: deze app
        (LAB21 Operations) en Zoho CRM zelf.
      </p>

      {/* Snapshot tiles */}
      <h2>Snapshot</h2>
      <div className="grid">
        <div className="card" style={{ borderLeft: "3px solid var(--color-tan)" }}>
          <div style={{ fontSize: 28, fontWeight: 500, letterSpacing: "-0.02em" }}>
            {liveCount}
            <span style={{ color: "var(--color-muted)", fontSize: 14, fontWeight: 400 }}>
              {" "}/ {processes.length}
            </span>
          </div>
          <div style={{ color: "var(--color-muted)", fontSize: 12, marginTop: 4 }}>
            Portal-processen live (deze app)
          </div>
        </div>
        <div className="card" style={{ borderLeft: "3px solid var(--color-clay)" }}>
          <div style={{ fontSize: 28, fontWeight: 500, letterSpacing: "-0.02em" }}>
            {zohoError ? "—" : zohoActive}
            {!zohoError && (
              <span style={{ color: "var(--color-muted)", fontSize: 14, fontWeight: 400 }}>
                {" "}/ {zohoRules.length}
              </span>
            )}
          </div>
          <div style={{ color: "var(--color-muted)", fontSize: 12, marginTop: 4 }}>
            Zoho-werkflowsregels actief
          </div>
        </div>
        <div className="card">
          <div style={{ fontSize: 28, fontWeight: 500, letterSpacing: "-0.02em" }}>
            {moduleCount}
          </div>
          <div style={{ color: "var(--color-muted)", fontSize: 12, marginTop: 4 }}>
            Zoho-modules in inventaris
          </div>
        </div>
        <div className="card">
          <div style={{ fontSize: 28, fontWeight: 500, letterSpacing: "-0.02em" }}>
            {crons.length}
          </div>
          <div style={{ color: "var(--color-muted)", fontSize: 12, marginTop: 4 }}>
            Cron-schedules op deze app
          </div>
        </div>
        <div className="card" style={{ borderLeft: "3px solid var(--color-clay)" }}>
          <div style={{ fontSize: 28, fontWeight: 500, letterSpacing: "-0.02em" }}>
            {planningStats.implemented}
            <span style={{ color: "var(--color-muted)", fontSize: 14, fontWeight: 400 }}>
              {" "}/ {planningStats.total}
            </span>
          </div>
          <div style={{ color: "var(--color-muted)", fontSize: 12, marginTop: 4 }}>
            Planning-regels in code
          </div>
        </div>
      </div>

      {/* App-side processes */}
      <h2>📱 Op deze applicatie — LAB21 Operations</h2>
      <p>
        Beslislogica die in code op deze portal draait. Stateless re-evaluatie,
        getriggerd door Zoho-webhooks of dagelijkse crons.
      </p>

      <h3 style={{ marginTop: 24 }}>Webhook-getriggerd ({webhooks.length})</h3>
      <div className="grid">
        {webhooks.map((p) => (
          <a
            key={p.id}
            href={`/processen/${p.id}`}
            className="card"
            style={{ textDecoration: "none", color: "var(--color-ink)" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, gap: 6 }}>
              <code>{p.id}</code>
              <span style={{ display: "flex", gap: 6 }}>
                {liveIds.has(p.id) ? (
                  <span className="badge" style={{ background: "var(--color-ink)", color: "var(--color-bone)" }}>
                    live
                  </span>
                ) : (
                  <span className="badge">planned</span>
                )}
                <span className="badge webhook">webhook</span>
              </span>
            </div>
            <strong>{p.title}</strong>
            <p style={{ color: "var(--color-muted)", margin: "6px 0 0", fontSize: 13 }}>
              {p.summary}
            </p>
          </a>
        ))}
      </div>

      <h3 style={{ marginTop: 24 }}>Cron-getriggerd ({crons.length})</h3>
      <div className="grid">
        {crons.map((p) => (
          <a
            key={p.id}
            href={`/processen/${p.id}`}
            className="card"
            style={{ textDecoration: "none", color: "var(--color-ink)" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, gap: 6 }}>
              <code>{p.id}</code>
              <span style={{ display: "flex", gap: 6 }}>
                {liveIds.has(p.id) ? (
                  <span className="badge" style={{ background: "var(--color-ink)", color: "var(--color-bone)" }}>
                    live
                  </span>
                ) : (
                  <span className="badge">planned</span>
                )}
                <span className="badge cron">cron</span>
              </span>
            </div>
            <strong>{p.title}</strong>
            <p style={{ color: "var(--color-muted)", margin: "6px 0 0", fontSize: 13 }}>
              {p.summary}
            </p>
          </a>
        ))}
      </div>

      {/* Planning-tijdlijn — codes + regels */}
      <h2 style={{ marginTop: 48 }}>📐 Planning-tijdlijn</h2>
      <p>
        Doelarchitectuur voor de uitvoeringsketen — codes (A01…V01) en de
        volgorderegels ertussen. Bron:{" "}
        <code>src/data/planning-tijdlijn.ts</code>.
      </p>

      <h3 style={{ marginTop: 24 }}>
        Regels — {planningStats.implemented} / {planningStats.total} in code
      </h3>
      <p style={{ color: "var(--color-muted)", fontSize: 13 }}>
        Welke planningsconstraints zijn al als logica ingebouwd, en welke nog
        niet. Niet-geïmplementeerde regels worden nu nog handmatig of door de
        configurator afgedwongen.
      </p>
      <div className="card">
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--color-line)" }}>
              <th style={th}>Status</th>
              <th style={th}>Expressie</th>
              <th style={th}>Uitleg</th>
              <th style={th}>In code</th>
            </tr>
          </thead>
          <tbody>
            {PLANNING_REGELS.map((r, i) => {
              const live = r.status === "implemented";
              return (
                <tr
                  key={i}
                  style={{
                    borderBottom: "1px solid var(--color-line)",
                    opacity: live ? 1 : 0.85,
                  }}
                >
                  <td style={td}>
                    <span
                      className="badge"
                      style={{
                        background: live ? "var(--color-ink)" : "var(--color-line)",
                        color: live ? "var(--color-bone)" : "var(--color-muted)",
                      }}
                    >
                      {live ? "live" : "planned"}
                    </span>
                  </td>
                  <td style={{ ...td, fontFamily: "monospace", fontSize: 12 }}>
                    {r.expressie}
                  </td>
                  <td style={{ ...td, color: "var(--color-ink)" }}>{r.uitleg}</td>
                  <td style={{ ...td, fontSize: 11, color: "var(--color-muted)" }}>
                    {r.implementatie ? (
                      <>
                        {r.implementatie.workflowId && (
                          <div>
                            <code>{r.implementatie.workflowId}</code>
                          </div>
                        )}
                        {r.implementatie.location && (
                          <code style={{ fontSize: 10 }}>
                            {r.implementatie.location}
                          </code>
                        )}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h3 style={{ marginTop: 32 }}>Codes — tijdlijn-omschrijvingen</h3>
      <p style={{ color: "var(--color-muted)", fontSize: 13 }}>
        De codeset (A01…V01) voor de tijdlijn. <strong>Nog niet als picklist
        in Zoho aanwezig</strong> — Datums_2 gebruikt nu nog DE-/KL-/LA-codes
        (zie <code>src/zoho/blueprints/tijdlijn.ts</code>). Migratie is een open
        punt. &quot;Extra vragen&quot; = wordt bij de klant uitgevraagd via
        de extra-vragen-flow.
      </p>
      <div className="card">
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--color-line)" }}>
              <th style={th}>Code</th>
              <th style={th}>Uitvoerder</th>
              <th style={th}>Omschrijving</th>
              <th style={th}>Wanneer uitgevraagd</th>
            </tr>
          </thead>
          <tbody>
            {TIJDLIJN_CODES.map((c) => (
              <tr key={c.code} style={{ borderBottom: "1px solid var(--color-line)" }}>
                <td style={{ ...td, fontFamily: "monospace", fontWeight: 500 }}>
                  {c.code}
                </td>
                <td style={td}>
                  <span
                    className="badge"
                    style={{
                      background:
                        c.uitvoerder === "Lab21"
                          ? "var(--color-tan)"
                          : c.uitvoerder === "Klant"
                            ? "var(--color-clay)"
                            : "var(--color-line)",
                      color:
                        c.uitvoerder === "Derden"
                          ? "var(--color-muted)"
                          : "var(--color-bone)",
                    }}
                  >
                    {c.uitvoerder}
                  </span>
                </td>
                <td style={td}>{c.omschrijving}</td>
                <td style={{ ...td, color: "var(--color-muted)", fontSize: 12 }}>
                  {c.extraVragen ? "Extra vragen" : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Zoho-side rules */}
      <h2 style={{ marginTop: 48 }}>🔄 In Zoho CRM — werkflowsregels</h2>
      <p>
        Native Zoho-automation aangemaakt via Zoho Setup → Automatisering →
        Werkflowsregels. Deze draaien in Zoho zelf, niet op deze portal.
      </p>

      {zohoError ? (
        <div className="error">
          Kon Zoho niet bereiken: {zohoError}
          <br />
          <small>
            Controleer of <code>ZOHO_REFRESH_TOKEN</code> in Vercel env staat.
          </small>
        </div>
      ) : zohoRules.length === 0 ? (
        <p style={{ color: "var(--color-muted)" }}>Geen werkflowsregels gevonden.</p>
      ) : (
        <>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            <div className="card">
              <div style={{ fontSize: 24, fontWeight: 500 }}>{zohoActive}</div>
              <div style={{ color: "var(--color-muted)", fontSize: 12 }}>Actief</div>
            </div>
            <div className="card">
              <div style={{ fontSize: 24, fontWeight: 500, color: "var(--color-muted)" }}>
                {zohoInactive}
              </div>
              <div style={{ color: "var(--color-muted)", fontSize: 12 }}>Inactief</div>
            </div>
            <div className="card">
              <div style={{ fontSize: 24, fontWeight: 500 }}>{zohoModules.length}</div>
              <div style={{ color: "var(--color-muted)", fontSize: 12 }}>Modules</div>
            </div>
          </div>

          {zohoModules.map((mod) => {
            const items = byModule.get(mod)!;
            return (
              <section key={mod}>
                <h3 style={{ marginTop: 32 }}>
                  {mod}{" "}
                  <span style={{ color: "var(--color-muted)", fontWeight: 400 }}>
                    ({items.length})
                  </span>
                </h3>
                <div className="card">
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--color-line)" }}>
                        <th style={th}>Status</th>
                        <th style={th}>Naam</th>
                        <th style={th}>Omschrijving</th>
                        <th style={th}>Zoho ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((r) => {
                        const active = r.status?.active !== false;
                        return (
                          <tr
                            key={r.id}
                            style={{
                              borderBottom: "1px solid var(--color-line)",
                              opacity: active ? 1 : 0.55,
                            }}
                          >
                            <td style={td}>
                              <span
                                className="badge"
                                style={{
                                  background: active ? "var(--color-ink)" : "var(--color-line)",
                                  color: active ? "var(--color-bone)" : "var(--color-muted)",
                                }}
                              >
                                {active ? "actief" : "uit"}
                              </span>
                            </td>
                            <td style={{ ...td, fontWeight: 500 }}>{r.name}</td>
                            <td style={{ ...td, color: "var(--color-muted)" }}>
                              {r.description ?? "—"}
                            </td>
                            <td style={td}>
                              <code style={{ fontSize: 11 }}>{r.id}</code>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
        </>
      )}
    </>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 12px 8px 0",
  color: "var(--color-muted)",
  fontWeight: 500,
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
};
const td: React.CSSProperties = {
  padding: "10px 12px 10px 0",
  verticalAlign: "top",
  color: "var(--color-ink)",
};
