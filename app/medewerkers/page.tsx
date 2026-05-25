import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/src/db";
import { setManager, toggleActive, addDelegation, deleteDelegation } from "./actions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function MedewerkersPage() {
  const allEmployees = await db
    .select()
    .from(schema.employees)
    .orderBy(asc(schema.employees.functie), asc(schema.employees.naam));

  const accountmanagers = allEmployees.filter((e) => e.functie === "Accountmanager");

  // Build lookup for manager name on each verkoper row
  const byId = new Map(allEmployees.map((e) => [e.id, e]));

  const delegations = await db
    .select()
    .from(schema.delegations)
    .orderBy(asc(schema.delegations.validFrom));

  return (
    <>
      <h1>Medewerkers</h1>
      <p>
        Identity-tabel voor LAB21. Hier wijs je per verkoper de default
        accountmanager toe en beheer je vakantievervangingen.
      </p>

      <h2>Medewerkers ({allEmployees.length})</h2>
      <div className="card">
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--color-line)" }}>
              <th style={th}>Naam</th>
              <th style={th}>Functie</th>
              <th style={th}>Vestiging</th>
              <th style={th}>Default AM</th>
              <th style={th}>Status</th>
              <th style={th}>Email</th>
            </tr>
          </thead>
          <tbody>
            {allEmployees.map((e) => {
              const isVerkoper = e.functie === "Verkoper";
              const mgrName = e.managerId ? byId.get(e.managerId)?.naam ?? "?" : "—";
              return (
                <tr key={e.id} style={{ borderBottom: "1px solid var(--color-line)", opacity: e.active ? 1 : 0.55 }}>
                  <td style={td}><strong>{e.naam}</strong></td>
                  <td style={td}>{e.functie}</td>
                  <td style={td}>{e.vestiging ?? "—"}</td>
                  <td style={td}>
                    {isVerkoper ? (
                      <form action={async (fd) => { "use server"; await setManager(e.id, String(fd.get("manager_id")) || null); }}>
                        <select
                          name="manager_id"
                          defaultValue={e.managerId ?? ""}
                          onChange={(ev) => (ev.currentTarget.form as HTMLFormElement).requestSubmit()}
                          style={selectStyle}
                        >
                          <option value="">— geen —</option>
                          {accountmanagers.map((am) => (
                            <option key={am.id} value={am.id}>
                              {am.naam} {am.active ? "" : "(disabled)"}
                            </option>
                          ))}
                        </select>
                      </form>
                    ) : (
                      <span style={{ color: "var(--color-muted)" }}>{mgrName}</span>
                    )}
                  </td>
                  <td style={td}>
                    <form action={async () => { "use server"; await toggleActive(e.id, !e.active); }}>
                      <button type="submit" style={statusButtonStyle(e.active)}>
                        {e.active ? "active" : "disabled"}
                      </button>
                    </form>
                  </td>
                  <td style={{ ...td, color: "var(--color-muted)", fontSize: 12 }}>{e.email}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2>Delegaties — vakantievervangingen ({delegations.length})</h2>
      <p style={{ color: "var(--color-muted)", fontSize: 13 }}>
        Tijdelijke vervanging van een AM. Tijdens een actieve delegatie krijgen
        nieuwe orders van de oorspronkelijke AM's verkopers de vervanger als AM.
      </p>

      <div className="card">
        <form action={addDelegation} style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr) auto", gap: 8, alignItems: "end" }}>
          <label style={labelStyle}>
            <span style={labelText}>Van AM</span>
            <select name="from_am_id" required style={selectStyle}>
              <option value="">— kies —</option>
              {accountmanagers.map((am) => (
                <option key={am.id} value={am.id}>{am.naam}</option>
              ))}
            </select>
          </label>
          <label style={labelStyle}>
            <span style={labelText}>Naar AM</span>
            <select name="to_am_id" required style={selectStyle}>
              <option value="">— kies —</option>
              {accountmanagers.map((am) => (
                <option key={am.id} value={am.id}>{am.naam}</option>
              ))}
            </select>
          </label>
          <label style={labelStyle}>
            <span style={labelText}>Van</span>
            <input type="date" name="valid_from" required style={inputStyle} />
          </label>
          <label style={labelStyle}>
            <span style={labelText}>T/m</span>
            <input type="date" name="valid_until" required style={inputStyle} />
          </label>
          <label style={labelStyle}>
            <span style={labelText}>Reden</span>
            <input type="text" name="reason" placeholder="vakantie" style={inputStyle} />
          </label>
          <button type="submit" style={primaryButton}>+ Toevoegen</button>
        </form>
      </div>

      {delegations.length > 0 && (
        <div className="card">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-line)" }}>
                <th style={th}>Periode</th>
                <th style={th}>Van AM</th>
                <th style={th}>Naar AM</th>
                <th style={th}>Reden</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {delegations.map((d) => (
                <tr key={d.id} style={{ borderBottom: "1px solid var(--color-line)" }}>
                  <td style={td}><code>{d.validFrom} → {d.validUntil}</code></td>
                  <td style={td}>{byId.get(d.fromAmId)?.naam ?? d.fromAmId}</td>
                  <td style={td}>{byId.get(d.toAmId)?.naam ?? d.toAmId}</td>
                  <td style={td}>{d.reason ?? "—"}</td>
                  <td style={td}>
                    <form action={async () => { "use server"; await deleteDelegation(d.id); }}>
                      <button type="submit" style={dangerButton}>verwijderen</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 12px 10px 0",
  color: "var(--color-muted)",
  fontWeight: 500,
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
};
const td: React.CSSProperties = {
  padding: "10px 12px 10px 0",
  verticalAlign: "middle",
};
const selectStyle: React.CSSProperties = {
  padding: "5px 8px",
  background: "white",
  border: "1px solid var(--color-line)",
  borderRadius: 4,
  fontSize: 13,
  color: "var(--color-ink)",
  width: "100%",
};
const inputStyle: React.CSSProperties = {
  padding: "5px 8px",
  background: "white",
  border: "1px solid var(--color-line)",
  borderRadius: 4,
  fontSize: 13,
  color: "var(--color-ink)",
  width: "100%",
};
const labelStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4 };
const labelText: React.CSSProperties = {
  fontSize: 10,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "var(--color-muted)",
};
const primaryButton: React.CSSProperties = {
  padding: "8px 16px",
  background: "var(--color-ink)",
  color: "var(--color-bone)",
  border: "none",
  borderRadius: 4,
  fontSize: 13,
  cursor: "pointer",
};
const dangerButton: React.CSSProperties = {
  padding: "4px 10px",
  background: "transparent",
  color: "var(--color-clay)",
  border: "1px solid var(--color-line)",
  borderRadius: 4,
  fontSize: 11,
  cursor: "pointer",
};
function statusButtonStyle(active: boolean): React.CSSProperties {
  return {
    padding: "3px 10px",
    background: active ? "var(--color-ink)" : "var(--color-line)",
    color: active ? "var(--color-bone)" : "var(--color-muted)",
    border: "none",
    borderRadius: 999,
    fontSize: 10.5,
    fontWeight: 500,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    cursor: "pointer",
  };
}
