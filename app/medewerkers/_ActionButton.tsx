"use client";

import { useState, useTransition } from "react";

/**
 * Knop die een server-action draait met:
 * - useTransition voor pending-state (visuele dimming + disabled)
 * - try/catch zodat errors naar de UI komen i.p.v. silently gedropt
 * - bevestigingsprompt optioneel
 */
export function ActionButton({
  action,
  children,
  confirmMessage,
  style,
  disabledStyle,
}: {
  action: () => Promise<void>;
  children: React.ReactNode;
  confirmMessage?: string;
  style?: React.CSSProperties;
  disabledStyle?: React.CSSProperties;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (confirmMessage && !window.confirm(confirmMessage)) return;
          setError(null);
          startTransition(async () => {
            try {
              await action();
            } catch (err) {
              setError((err as Error).message || "Onbekende fout");
            }
          });
        }}
        style={{
          cursor: pending ? "wait" : "pointer",
          ...style,
          ...(pending ? disabledStyle ?? { opacity: 0.5 } : {}),
        }}
      >
        {children}
      </button>
      {error && (
        <span
          role="alert"
          title={error}
          style={{
            fontSize: 11,
            color: "var(--color-clay)",
            cursor: "help",
          }}
        >
          ⚠ fout
        </span>
      )}
    </span>
  );
}
