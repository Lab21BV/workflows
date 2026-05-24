"use client";
import { useState } from "react";

export type TodoItem = {
  id: string;
  Subject: string;
  Description: string | null;
  Created_Time: string;
  What_Id: { id: string; name: string } | null;
};

export function TodoList({ items }: { items: TodoItem[] }) {
  const [resolved, setResolved] = useState<Set<string>>(new Set());

  async function resolve(id: string) {
    const res = await fetch(`/api/todo/${id}/resolve`, { method: "POST" });
    if (res.ok) setResolved((s) => new Set(s).add(id));
  }

  const visible = items.filter((i) => !resolved.has(i.id));
  if (visible.length === 0) {
    return (
      <div className="card">
        <p>Geen openstaande taken.</p>
      </div>
    );
  }
  return (
    <div className="grid">
      {visible.map((t) => (
        <div className="card" key={t.id}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <strong>{t.Subject}</strong>
            <span style={{ color: "var(--muted)", fontSize: 12 }}>
              {t.Created_Time.slice(0, 16).replace("T", " ")}
            </span>
          </div>
          {t.Description && (
            <p style={{ color: "var(--fg)", margin: "4px 0 12px" }}>{t.Description}</p>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            {t.What_Id && <a href={`/tijdlijn/${t.What_Id.id}`}>→ Tijdlijn</a>}
            <button
              onClick={() => resolve(t.id)}
              style={{
                marginLeft: "auto",
                padding: "4px 10px",
                background: "var(--accent)",
                color: "white",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              Mark resolved
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
