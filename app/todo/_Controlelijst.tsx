import { controlelijstVoor, type ControleRol } from "@/src/data/order-status-controlelijst";

export function Controlelijst({ rol }: { rol: ControleRol }) {
  const fasen = controlelijstVoor(rol);
  return (
    <>
      <h2>Controlelijst per orderstatus</h2>
      <p style={{ color: "var(--color-muted)", fontSize: 13 }}>
        Per Sales_Orders-fase wat deze rol moet controleren. Bron:{" "}
        <code>src/data/order-status-controlelijst.ts</code> — bewerk daar om de
        lijst aan te passen.
      </p>
      <div className="grid">
        {fasen.map((fase) => (
          <div key={fase.actual} className="card">
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <strong>{fase.display}</strong>
              <span className="badge" style={{ background: "var(--color-line)", color: "var(--color-muted)" }}>
                fase {fase.sequence}
              </span>
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, lineHeight: 1.6, color: "var(--color-ink-soft)" }}>
              {fase.items.map((item, i) => (
                <li key={i}>{item.check}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </>
  );
}
