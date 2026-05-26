import type { StoredSubmission } from "@/src/repo/inmeet";
import { formatInmeetSamenvatting } from "@/src/data/inmeet-form-schema";
import { approveInmeet, rejectInmeet } from "../todo/accountmanager/inmeet-actions";

function fmtDate(d: Date | string | null): string {
  if (!d) return "";
  const s = typeof d === "string" ? d : d.toISOString();
  return s.slice(0, 16).replace("T", " ");
}

export function InmeetControleLijst({ items }: { items: StoredSubmission[] }) {
  if (items.length === 0) {
    return (
      <div className="card">
        <p>Geen ingediende inmeetformulieren wachten op controle.</p>
      </div>
    );
  }
  return (
    <div className="grid">
      {items.map((s) => (
        <details key={s.id} className="card">
          <summary style={{ cursor: "pointer" }}>
            <strong>{s.payload.naamKlant}</strong>{" "}
            <span style={{ color: "var(--color-muted)" }}>
              — order {s.zohoOrderId} · ingediend {fmtDate(s.submittedAt)}
            </span>
          </summary>
          <pre
            style={{
              marginTop: 10,
              padding: 12,
              background: "var(--color-bone)",
              border: "1px solid var(--color-line)",
              borderRadius: 4,
              fontSize: 12,
              whiteSpace: "pre-wrap",
              overflow: "auto",
            }}
          >
            {formatInmeetSamenvatting(s.payload)}
          </pre>

          <form
            action={approveInmeet}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr auto",
              gap: 8,
              marginTop: 12,
              alignItems: "center",
            }}
          >
            <input type="hidden" name="id" value={s.id} />
            <input
              name="aannemerId"
              placeholder="Aannemer-ID toewijzen (employees.id)"
              style={inputStyle}
              required
            />
            <input
              name="amNotitie"
              placeholder="Notitie (optioneel)"
              style={inputStyle}
            />
            <button type="submit" style={approveBtn}>
              Goedkeuren → doorzetten
            </button>
          </form>

          <form
            action={rejectInmeet}
            style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}
          >
            <input type="hidden" name="id" value={s.id} />
            <input
              name="amNotitie"
              placeholder="Reden afwijzing"
              style={{ ...inputStyle, flex: 1 }}
              required
            />
            <button type="submit" style={rejectBtn}>
              Afwijzen
            </button>
          </form>
        </details>
      ))}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "6px 8px",
  border: "1px solid var(--color-line)",
  borderRadius: 4,
  fontSize: 13,
  background: "white",
};

const approveBtn: React.CSSProperties = {
  padding: "6px 12px",
  background: "var(--color-ink)",
  color: "var(--color-bone)",
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
  fontSize: 13,
};

const rejectBtn: React.CSSProperties = {
  padding: "6px 12px",
  background: "var(--color-clay)",
  color: "white",
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
  fontSize: 13,
};
