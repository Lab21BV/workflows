import type { ZohoClient } from "../zoho/client.js";
import type { RecordsApi, ZohoRecord } from "../zoho/records.js";

export interface WorkflowContext {
  zoho: ZohoClient;
  records: RecordsApi;
  now: Date;
  logger: WorkflowLogger;
}

export interface WorkflowLogger {
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
}

export interface WorkflowTrigger<TPayload = unknown> {
  readonly name: string;
  readonly description: string;
  /** Validate + parse incoming trigger data into a typed payload. */
  parse(input: unknown): TPayload;
}

export interface Workflow<TPayload = unknown> {
  readonly id: string;
  readonly description: string;
  readonly trigger: WorkflowTrigger<TPayload>;
  run(payload: TPayload, ctx: WorkflowContext): Promise<WorkflowResult>;
}

export interface WorkflowResult {
  status: "ok" | "skipped" | "error";
  message?: string;
  data?: Record<string, unknown>;
}

export type ZohoCrudEvent =
  | { module: string; operation: "create"; record: ZohoRecord }
  | { module: string; operation: "edit"; record: ZohoRecord; previous?: Partial<ZohoRecord> }
  | { module: string; operation: "delete"; ids: string[] };
