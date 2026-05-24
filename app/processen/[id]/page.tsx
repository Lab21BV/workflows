import { notFound } from "next/navigation";
import { PROCESSES } from "@/src/processes";
import { MermaidDiagram } from "../_MermaidDiagram";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(PROCESSES).map((id) => ({ id }));
}

export default async function ProcesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const p = PROCESSES[id];
  if (!p) notFound();

  return (
    <>
      <p style={{ marginBottom: 12 }}>
        <a href="/processen">← Alle processen</a>
      </p>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ margin: 0 }}>{p.title}</h1>
        <span className={`badge ${p.kind}`}>{p.kind}</span>
      </div>
      <p style={{ marginTop: 8 }}>{p.summary}</p>

      <div className="card" style={{ borderLeft: "4px solid var(--accent)", marginTop: 12 }}>
        <strong>📱 Draait op:</strong> deze portal (LAB21 Operations app) —{" "}
        <em>niet</em> in Zoho CRM zelf. De beslislogica zit in code; Zoho fungeert
        als data-bron (SSOT). Voor de native Zoho werkflowsregels zie{" "}
        <a href="/processen/zoho-crm">/processen/zoho-crm</a>.
      </div>

      {p.supersedes && p.supersedes.length > 0 && (
        <>
          <h2>Vervangt deze Zoho-CRM werkflowsregels</h2>
          <div className="card">
            <p style={{ color: "var(--fg)", margin: "0 0 12px" }}>
              Deze portal-flow heeft de volgende Zoho-native regels overgenomen.
              Ze zijn uitgeschakeld bij cutover — terugzetten kan via Zoho Setup
              → Automatisering → Werkflowsregels.
            </p>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <th style={th}>Naam</th>
                  <th style={th}>Zoho ID</th>
                  <th style={th}>Uitgeschakeld</th>
                </tr>
              </thead>
              <tbody>
                {p.supersedes.map((s, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={td}>{s.name}</td>
                    <td style={td}>
                      {s.id ? <code style={{ fontSize: 11 }}>{s.id}</code> : "—"}
                    </td>
                    <td style={td}>{s.disabledOn ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h2>Wanneer draait het?</h2>
      <div className="card">
        <p style={{ color: "var(--fg)", margin: 0 }}>{p.trigger}</p>
      </div>

      <h2>Wat doet het?</h2>
      <div className="card">
        <p style={{ color: "var(--fg)", margin: 0 }}>{p.what}</p>
      </div>

      <h2>Beslisboom</h2>
      <MermaidDiagram source={p.mermaid} />

      {p.fields && p.fields.length > 0 && (
        <>
          <h2>Zoho-velden ({p.fields.length})</h2>
          <div className="card">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <th style={th}>Module</th>
                  <th style={th}>Veld</th>
                  <th style={th}>Doel</th>
                </tr>
              </thead>
              <tbody>
                {p.fields.map((f, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={td}><code style={{ fontSize: 12 }}>{f.module}</code></td>
                    <td style={td}><code style={{ fontSize: 12 }}>{f.name}</code></td>
                    <td style={td}>{f.purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
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
const td: React.CSSProperties = {
  padding: "8px 8px 8px 0",
  verticalAlign: "top",
  color: "var(--fg)",
};
