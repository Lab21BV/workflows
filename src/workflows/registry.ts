import type { Workflow } from "./types.js";
import { voorinspectieAfgerond } from "./voorinspectie-afgerond.js";
import { voorinspectieNoResponse } from "./voorinspectie-no-response.js";
import { showroomAfspraakGeweest } from "./showroom-afspraak-geweest.js";
import { klantenserviceNieuw } from "./klantenservice-nieuw.js";

export const WORKFLOWS: Record<string, Workflow<unknown>> = {
  [voorinspectieAfgerond.id]: voorinspectieAfgerond as Workflow<unknown>,
  [voorinspectieNoResponse.id]: voorinspectieNoResponse as Workflow<unknown>,
  [showroomAfspraakGeweest.id]: showroomAfspraakGeweest as Workflow<unknown>,
  [klantenserviceNieuw.id]: klantenserviceNieuw as Workflow<unknown>,
};

export type WorkflowId = keyof typeof WORKFLOWS;

export function getWorkflow(id: string): Workflow<unknown> | undefined {
  return (WORKFLOWS as Record<string, Workflow<unknown>>)[id];
}
