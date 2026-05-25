"use client";

import { useRef, useTransition } from "react";
import { setManager } from "./actions";

interface AmOption {
  id: string;
  naam: string;
  active: boolean;
}

export function ManagerSelect({
  employeeId,
  currentManagerId,
  options,
}: {
  employeeId: string;
  currentManagerId: string | null;
  options: AmOption[];
}) {
  const ref = useRef<HTMLSelectElement>(null);
  const [pending, startTransition] = useTransition();
  return (
    <select
      ref={ref}
      defaultValue={currentManagerId ?? ""}
      disabled={pending}
      onChange={() => {
        const value = ref.current?.value || null;
        startTransition(async () => {
          await setManager(employeeId, value);
        });
      }}
      style={{
        padding: "5px 8px",
        background: "white",
        border: "1px solid var(--color-line)",
        borderRadius: 4,
        fontSize: 13,
        color: "var(--color-ink)",
        width: "100%",
        opacity: pending ? 0.6 : 1,
      }}
    >
      <option value="">— geen —</option>
      {options.map((am) => (
        <option key={am.id} value={am.id}>
          {am.naam} {am.active ? "" : "(disabled)"}
        </option>
      ))}
    </select>
  );
}
