import { PROCESSES } from "@/src/processes";

export const dynamic = "force-static";

export default function ProcessenIndex() {
  const list = Object.values(PROCESSES);
  const webhooks = list.filter((p) => p.kind === "webhook");
  const crons = list.filter((p) => p.kind === "cron");
  return (
    <>
      <h1>Processen</h1>
      <p>
        Alle automatiseringen die LAB21 Operations momenteel draait. Klik op een
        proces om het stappenplan, de triggers en de Zoho-velden te bekijken.
      </p>

      <h2>Webhook-getriggerd ({webhooks.length})</h2>
      <div className="grid">
        {webhooks.map((p) => (
          <a
            key={p.id}
            href={`/processen/${p.id}`}
            className="card"
            style={{ textDecoration: "none", color: "var(--fg)" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <code>{p.id}</code>
              <span className="badge webhook">webhook</span>
            </div>
            <strong>{p.title}</strong>
            <p style={{ color: "var(--muted)", margin: "6px 0 0", fontSize: 13 }}>{p.summary}</p>
          </a>
        ))}
      </div>

      <h2>Cron-getriggerd ({crons.length})</h2>
      <div className="grid">
        {crons.map((p) => (
          <a
            key={p.id}
            href={`/processen/${p.id}`}
            className="card"
            style={{ textDecoration: "none", color: "var(--fg)" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <code>{p.id}</code>
              <span className="badge cron">cron</span>
            </div>
            <strong>{p.title}</strong>
            <p style={{ color: "var(--muted)", margin: "6px 0 0", fontSize: 13 }}>{p.summary}</p>
          </a>
        ))}
      </div>
    </>
  );
}
