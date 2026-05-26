import type { SalesControleRow } from "@/src/repo/sales-orders";

function truncate(text: string | null, max = 140): string {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 16).replace("T", " ");
}

export function SalesControleLijst({ rows }: { rows: SalesControleRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="card">
        <p>Geen orders wachten op salescontrole.</p>
      </div>
    );
  }
  return (
    <div className="card">
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid var(--color-line)" }}>
            <th style={{ padding: "6px 8px" }}>Order</th>
            <th style={{ padding: "6px 8px" }}>Klant</th>
            <th style={{ padding: "6px 8px" }}>Accountmanager</th>
            <th style={{ padding: "6px 8px" }}>Opmerkingen</th>
            <th style={{ padding: "6px 8px" }}>Sinds</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} style={{ borderBottom: "1px solid var(--color-line)" }}>
              <td style={{ padding: "6px 8px" }}>
                <a href={`/tijdlijn/${r.id}`}>{r.SO_Number ?? r.Subject ?? r.id}</a>
              </td>
              <td style={{ padding: "6px 8px" }}>{r.Account_Name?.name ?? "—"}</td>
              <td style={{ padding: "6px 8px" }}>{r.Owner?.name ?? "—"}</td>
              <td style={{ padding: "6px 8px", color: "var(--color-ink-soft)" }}>
                {truncate(r.Description)}
              </td>
              <td style={{ padding: "6px 8px", color: "var(--color-muted)" }}>
                {fmtDate(r.Modified_Time)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
