import { WORKFLOWS } from "@/src/workflows/registry";
import { MODULES } from "@/src/zoho/modules";

export const dynamic = "force-static";

export default function HomePage() {
  const workflows = Object.values(WORKFLOWS);
  const byKind: Record<string, number> = {};
  for (const m of Object.values(MODULES)) byKind[m.kind] = (byKind[m.kind] ?? 0) + 1;

  return (
    <>
      <h1>Workflow dashboard</h1>
      <p>Code-based herbouw van Zoho CRM automatiseringen voor LAB21 BV.</p>

      <h2>Registered workflows ({workflows.length})</h2>
      <div className="grid">
        {workflows.map((w) => {
          const isCron = w.trigger.name.startsWith("cron.");
          return (
            <div className="card" key={w.id}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <code>{w.id}</code>
                <span className={`badge ${isCron ? "cron" : "webhook"}`}>
                  {isCron ? "cron" : "webhook"}
                </span>
              </div>
              <p style={{ color: "var(--fg)", margin: "4px 0 8px" }}>{w.description}</p>
              <dl className="kv">
                <dt>trigger</dt>
                <dd>{w.trigger.name}</dd>
              </dl>
            </div>
          );
        })}
      </div>

      <h2>Module inventory ({Object.keys(MODULES).length})</h2>
      <div className="grid">
        {Object.entries(byKind).map(([kind, count]) => (
          <div className="card" key={kind}>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{count}</div>
            <div style={{ color: "var(--muted)", fontSize: 13 }}>{kind} modules</div>
          </div>
        ))}
      </div>

      <h2>Cron schedules (UTC)</h2>
      <div className="card">
        <dl className="kv">
          <dt>07:00 daily</dt>
          <dd>/api/cron/vi-reschedule-stuck</dd>
          <dt>08:00 daily</dt>
          <dd>/api/cron/showroom-review-followup</dd>
          <dt>08:30 daily</dt>
          <dd>/api/cron/voorinspectie-no-response</dd>
        </dl>
      </div>

    </>
  );
}
