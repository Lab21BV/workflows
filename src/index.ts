import { ZohoClient, RecordsApi } from "./zoho/index";
import { getWorkflow } from "./workflows/registry";
import type { WorkflowContext, WorkflowLogger, WorkflowResult } from "./workflows/types";
import { recordDecision } from "./lib/decision-log";

const consoleLogger: WorkflowLogger = {
  info: (msg, meta) => console.log(JSON.stringify({ level: "info", msg, ...meta })),
  warn: (msg, meta) => console.warn(JSON.stringify({ level: "warn", msg, ...meta })),
  error: (msg, meta) => console.error(JSON.stringify({ level: "error", msg, ...meta })),
};

export async function runWorkflow(id: string, input: unknown): Promise<unknown> {
  const wf = getWorkflow(id);
  if (!wf) throw new Error(`Unknown workflow: ${id}`);

  const zoho = new ZohoClient();
  const ctx: WorkflowContext = {
    zoho,
    records: new RecordsApi(zoho),
    now: new Date(),
    logger: consoleLogger,
  };
  const payload = wf.trigger.parse(input);

  const startedAt = Date.now();
  let result: WorkflowResult | null = null;
  let error: Error | null = null;
  try {
    result = await wf.run(payload, ctx);
    return result;
  } catch (err) {
    error = err as Error;
    throw err;
  } finally {
    // Audit-log fire-and-forget. Schrijft naar Postgres `decision_log` en
    // slikt eigen errors zodat de workflow-uitkomst nooit afhankelijk is
    // van de audit-trail.
    await recordDecision({
      workflowId: id,
      triggerName: wf.trigger.name,
      payload,
      result,
      error,
      durationMs: Date.now() - startedAt,
    });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , id, raw] = process.argv;
  if (!id) {
    console.error("usage: tsx src/index.ts <workflow-id> '<json-payload>'");
    process.exit(2);
  }
  const payload = raw ? JSON.parse(raw) : {};
  runWorkflow(id, payload).then(
    (result) => {
      console.log(JSON.stringify(result, null, 2));
    },
    (err) => {
      console.error(err);
      process.exit(1);
    },
  );
}
