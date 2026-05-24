import type { Workflow } from "./types";
import { voorinspectieAfgerond } from "./voorinspectie-afgerond";
import { voorinspectieNoResponse } from "./voorinspectie-no-response";
import { showroomAfspraakGeweest } from "./showroom-afspraak-geweest";
import { klantenserviceNieuw } from "./klantenservice-nieuw";
import { viReschedule } from "./vi-reschedule/run";

export const WORKFLOWS: Record<string, Workflow<unknown>> = {
  [voorinspectieAfgerond.id]: voorinspectieAfgerond as Workflow<unknown>,
  [voorinspectieNoResponse.id]: voorinspectieNoResponse as Workflow<unknown>,
  [showroomAfspraakGeweest.id]: showroomAfspraakGeweest as Workflow<unknown>,
  [klantenserviceNieuw.id]: klantenserviceNieuw as Workflow<unknown>,
  [viReschedule.id]: viReschedule as Workflow<unknown>,
};

export type WorkflowId = keyof typeof WORKFLOWS;

export function getWorkflow(id: string): Workflow<unknown> | undefined {
  return (WORKFLOWS as Record<string, Workflow<unknown>>)[id];
}
