import { ZohoClient } from "@/src/zoho/client";

export const dynamic = "force-dynamic"; // always fetch fresh from Zoho
export const runtime = "nodejs";

type ZohoRule = {
  id: string;
  name: string;
  module?: { api_name?: string };
  status?: { active?: boolean };
  description?: string | null;
  modified_time?: string;
};

async function fetchRules(): Promise<ZohoRule[]> {
  const zoho = new ZohoClient();
  const res = await zoho.request<{ workflow_rules?: ZohoRule[] }>(
    "/settings/automation/workflow_rules",
  );
  return res.workflow_rules ?? [];
}

export default async function ZohoRulesPage() {
  let rules: ZohoRule[] = [];
  let fetchError: string | null = null;
  try {
    rules = await fetchRules();
  } catch (e) {
    fetchError = (e as Error).message;
  }

  // Group by module
  const byModule = new Map<string, ZohoRule[]>();
  for (const r of rules) {
    const m = r.module?.api_name ?? "?";
    if (!byModule.has(m)) byModule.set(m, []);
    byModule.get(m)!.push(r);
  }
  const modules = [...byModule.keys()].sort();
  const totalActive = rules.filter((r) => r.status?.active !== false).length;
  const totalInactive = rules.length - totalActive;

  return (
    <>
      <p style={{ marginBottom: 12 }}>
        <a href="/processen">← Terug naar alle processen</a>
      </p>

      <h1>Zoho CRM — werkflowsregels</h1>
      <p>
        Live lijst van alle werkflowsregels die direct in Zoho CRM zijn
        geconfigureerd (Setup → Automatisering → Werkflowsregels). Deze regels
        draaien in Zoho zelf — niet op deze portal — en zijn aangemaakt via de
        Zoho admin-UI.
      </p>

      {fetchError ? (
        <div className="error">
          Kon Zoho niet bereiken: {fetchError}
          <br />
          <small>
            Controleer of <code>ZOHO_REFRESH_TOKEN</code> in de Vercel env staat
            en niet gerate-limit is.
          </small>
        </div>
      ) : (
        <>
          <div className="grid">
            <div className="card">
              <div style={{ fontSize: 24, fontWeight: 700 }}>{rules.length}</div>
              <div style={{ color: "var(--muted)", fontSize: 12 }}>Totaal regels</div>
            </div>
            <div className="card">
              <div style={{ fontSize: 24, fontWeight: 700, color: "var(--ok)" }}>
                {totalActive}
              </div>
              <div style={{ color: "var(--muted)", fontSize: 12 }}>Actief</div>
            </div>
            <div className="card">
              <div style={{ fontSize: 24, fontWeight: 700, color: "var(--muted)" }}>
                {totalInactive}
              </div>
              <div style={{ color: "var(--muted)", fontSize: 12 }}>Inactief</div>
            </div>
            <div className="card">
              <div style={{ fontSize: 24, fontWeight: 700 }}>{modules.length}</div>
              <div style={{ color: "var(--muted)", fontSize: 12 }}>Modules</div>
            </div>
          </div>

          {modules.map((mod) => {
            const items = byModule.get(mod)!;
            return (
              <section key={mod}>
                <h2>
                  {mod}{" "}
                  <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: 14 }}>
                    ({items.length})
                  </span>
                </h2>
                <div className="card">
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border)" }}>
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
                              borderBottom: "1px solid var(--border)",
                              opacity: active ? 1 : 0.55,
                            }}
                          >
                            <td style={td}>
                              <span
                                className="badge"
                                style={{
                                  background: active ? "var(--ok)" : "var(--muted)",
                                  color: active ? "var(--bg)" : "var(--fg)",
                                  padding: "1px 7px",
                                  borderRadius: 3,
                                  fontSize: 10,
                                  textTransform: "uppercase",
                                }}
                              >
                                {active ? "actief" : "uit"}
                              </span>
                            </td>
                            <td style={{ ...td, fontWeight: 600 }}>{r.name}</td>
                            <td style={{ ...td, color: "var(--muted)" }}>
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
  color: "var(--muted)",
  fontWeight: 600,
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: 0.05,
};
const td: React.CSSProperties = {
  padding: "10px 12px 10px 0",
  verticalAlign: "top",
  color: "var(--fg)",
};
