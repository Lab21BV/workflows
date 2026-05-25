/**
 * LAB21 Tasks.Department taxonomy.
 *
 * First-class shared enum (was previously buried in
 * src/workflows/vi-reschedule/types.ts). Used by:
 *   - src/repo/tasks.ts (createTodo / listOpen filter)
 *   - src/workflows/vi-reschedule/* (create_todo outcomes)
 *   - The /todo/{accountmanager,inkoop-planning} pages
 *   - Future workflows that route follow-ups by team
 *
 * NB: the exact strings here are written to Zoho's `Tasks.Department`
 * field — do not change them without a Zoho-side data migration.
 */

import { z } from "zod";

export const DEPARTMENTS = ["accountmanager", "inkoop_planning"] as const;

export type Department = (typeof DEPARTMENTS)[number];

export const departmentSchema = z.enum(DEPARTMENTS);

/** Human-readable label voor de UI. */
export function departmentLabel(d: Department): string {
  switch (d) {
    case "accountmanager":
      return "Accountmanager";
    case "inkoop_planning":
      return "Inkoop en Planning";
  }
}
