import type { Workflow } from "./types.js";
import { voorinspectieAfgerond } from "./voorinspectie-afgerond.js";

export const WORKFLOWS: Record<string, Workflow<unknown>> = {
  [voorinspectieAfgerond.id]: voorinspectieAfgerond as Workflow<unknown>,
};

export type WorkflowId = keyof typeof WORKFLOWS;

export function getWorkflow(id: string): Workflow<unknown> | undefined {
  return (WORKFLOWS as Record<string, Workflow<unknown>>)[id];
}
