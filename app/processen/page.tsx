import { PROCESSES } from "@/src/processes";
import { WORKFLOWS } from "@/src/workflows/registry";

export const dynamic = "force-static";

export default function ProcessenIndex() {
  const list = Object.values(PROCESSES);
  const webhooks = list.filter((p) => p.kind === "webhook");
  const crons = list.filter((p) => p.kind === "cron");
  const liveIds = new Set(Object.keys(WORKFLOWS));
  const liveCount = list.filter((p) => liveIds.has(p.id)).length;
  return (
    <>
      <h1>Processen</h1>
      <p>
        Automatiseringen die LAB21 gebruikt — verdeeld in twee bronnen:
      </p>

      <div className="grid">
        <div className="card" style={{ borderLeft: "4px solid var(--accent)" }}>
          <strong>📱 Op deze portal — LAB21 Operations app</strong>
          <p style={{ color: "var(--muted)", margin: "6px 0 0", fontSize: 13 }}>
            Beslislogica die in code draait (deze app). Stateless re-evaluatie
            getriggerd door Zoho-webhooks of door dagelijkse crons. {liveCount}{" "}
            van {list.length} processen zijn live geregistreerd in de workflow-registry.
          </p>
        </div>
        <a
          href="/processen/zoho-crm"
          className="card"
          style={{ borderLeft: "4px solid var(--warn)", textDecoration: "none", color: "var(--fg)" }}
        >
          <strong>🔄 In Zoho CRM — werkflowsregels</strong>
          <p style={{ color: "var(--muted)", margin: "6px 0 0", fontSize: 13 }}>
            Native Zoho automation (workflow rules) die direct binnen Zoho draaien.
            Aangemaakt via Zoho Setup → Automatisering → Werkflowsregels.{" "}
            <strong style={{ color: "var(--fg)" }}>Klik om de live lijst te bekijken →</strong>
          </p>
        </a>
      </div>

      <h2>Portal-processen — Webhook-getriggerd ({webhooks.length})</h2>
      <div className="grid">
        {webhooks.map((p) => (
          <a
            key={p.id}
            href={`/processen/${p.id}`}
            className="card"
            style={{ textDecoration: "none", color: "var(--fg)" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, gap: 6 }}>
              <code>{p.id}</code>
              <span style={{ display: "flex", gap: 6 }}>
                {liveIds.has(p.id) ? (
                  <span className="badge" style={{ background: "var(--accent)", color: "white" }}>
                    live
                  </span>
                ) : (
                  <span className="badge" style={{ background: "var(--muted)", color: "white" }}>
                    planned
                  </span>
                )}
                <span className="badge webhook">webhook</span>
              </span>
            </div>
            <strong>{p.title}</strong>
            <p style={{ color: "var(--muted)", margin: "6px 0 0", fontSize: 13 }}>{p.summary}</p>
            {p.supersedes && p.supersedes.length > 0 && (
              <p style={{ color: "var(--muted)", margin: "8px 0 0", fontSize: 11 }}>
                Vervangt {p.supersedes.length} oude Zoho-regel{p.supersedes.length === 1 ? "" : "s"}.
              </p>
            )}
          </a>
        ))}
      </div>

      <h2>Portal-processen — Cron-getriggerd ({crons.length})</h2>
      <div className="grid">
        {crons.map((p) => (
          <a
            key={p.id}
            href={`/processen/${p.id}`}
            className="card"
            style={{ textDecoration: "none", color: "var(--fg)" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, gap: 6 }}>
              <code>{p.id}</code>
              <span style={{ display: "flex", gap: 6 }}>
                {liveIds.has(p.id) ? (
                  <span className="badge" style={{ background: "var(--accent)", color: "white" }}>
                    live
                  </span>
                ) : (
                  <span className="badge" style={{ background: "var(--muted)", color: "white" }}>
                    planned
                  </span>
                )}
                <span className="badge cron">cron</span>
              </span>
            </div>
            <strong>{p.title}</strong>
            <p style={{ color: "var(--muted)", margin: "6px 0 0", fontSize: 13 }}>{p.summary}</p>
          </a>
        ))}
      </div>
    </>
  );
}
