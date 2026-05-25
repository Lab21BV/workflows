import { createHash } from "node:crypto";
import { db, schema } from "../db";
import type { WorkflowResult } from "../workflows/types";

/**
 * Schrijf één rij naar `decision_log` voor elke workflow-invocatie.
 *
 * Failure-safe: als het loggen zelf faalt (DB down, schema-drift), wordt
 * de fout naar console gestuurd maar NIET geescaleerd. De workflow-uitkomst
 * mag nooit blokkeren op een audit-trail-issue.
 */
export async function recordDecision(input: {
  workflowId: string;
  triggerName: string;
  payload: unknown;
  result: WorkflowResult | null;
  error: Error | null;
  durationMs: number;
}): Promise<void> {
  try {
    const payloadJson = (typeof input.payload === "object" && input.payload !== null
      ? (input.payload as Record<string, unknown>)
      : { value: input.payload }) as Record<string, unknown>;
    const inputHash = createHash("sha256")
      .update(JSON.stringify(payloadJson))
      .digest("hex")
      .slice(0, 16);
    const outcomes = (input.result?.data?.outcomes as unknown[]) ?? null;

    await db.insert(schema.decisionLog).values({
      workflowId: input.workflowId,
      triggerName: input.triggerName,
      inputHash,
      payload: payloadJson,
      outcomes,
      status: input.error ? "error" : input.result?.status ?? "ok",
      message: input.result?.message ?? null,
      error: input.error?.message ?? null,
      durationMs: input.durationMs,
    });
  } catch (logErr) {
    console.error("decision_log write failed (ignored):", (logErr as Error).message);
  }
}
