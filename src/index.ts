import { ZohoClient, RecordsApi } from "./zoho/index.js";
import { getWorkflow } from "./workflows/registry.js";
import type { WorkflowContext, WorkflowLogger } from "./workflows/types.js";

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
  return wf.run(payload, ctx);
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
