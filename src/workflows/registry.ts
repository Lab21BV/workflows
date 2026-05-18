import type { Workflow } from "./types.js";
import { voorinspectieAfgerond } from "./voorinspectie-afgerond.js";

export const WORKFLOWS = {
  [voorinspectieAfgerond.id]: voorinspectieAfgerond,
} as const satisfies Record<string, Workflow<unknown>>;

export type WorkflowId = keyof typeof WORKFLOWS;

export function getWorkflow(id: string): Workflow<unknown> | undefined {
  return (WORKFLOWS as Record<string, Workflow<unknown>>)[id];
}
