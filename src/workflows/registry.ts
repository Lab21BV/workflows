import type { Workflow } from "./types";
import { voorinspectieAfgerond } from "./voorinspectie-afgerond";
import { voorinspectieNoResponse } from "./voorinspectie-no-response";
import { showroomAfspraakGeweest } from "./showroom-afspraak-geweest";
import { showroomReviewFollowup } from "./showroom-review-followup";
import { klantenserviceNieuw } from "./klantenservice-nieuw";
import { viReschedule } from "./vi-reschedule/run";
import { viRescheduleStuck } from "./vi-reschedule-stuck";
import { salesOrderNaarOrdercheck } from "./sales-order-naar-ordercheck";

export const WORKFLOWS: Record<string, Workflow<unknown>> = {
  [voorinspectieAfgerond.id]: voorinspectieAfgerond as Workflow<unknown>,
  [voorinspectieNoResponse.id]: voorinspectieNoResponse as Workflow<unknown>,
  [showroomAfspraakGeweest.id]: showroomAfspraakGeweest as Workflow<unknown>,
  [showroomReviewFollowup.id]: showroomReviewFollowup as Workflow<unknown>,
  [klantenserviceNieuw.id]: klantenserviceNieuw as Workflow<unknown>,
  [viReschedule.id]: viReschedule as Workflow<unknown>,
  [viRescheduleStuck.id]: viRescheduleStuck as Workflow<unknown>,
  [salesOrderNaarOrdercheck.id]: salesOrderNaarOrdercheck as Workflow<unknown>,
};

export type WorkflowId = keyof typeof WORKFLOWS;

export function getWorkflow(id: string): Workflow<unknown> | undefined {
  return (WORKFLOWS as Record<string, Workflow<unknown>>)[id];
}
