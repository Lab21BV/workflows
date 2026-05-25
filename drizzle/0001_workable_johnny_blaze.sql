CREATE TABLE "decision_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_id" text NOT NULL,
	"trigger_name" text NOT NULL,
	"input_hash" text NOT NULL,
	"payload" jsonb,
	"outcomes" jsonb,
	"status" text NOT NULL,
	"message" text,
	"error" text,
	"duration_ms" integer,
	"fired_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "decision_log_workflow_idx" ON "decision_log" USING btree ("workflow_id","fired_at");--> statement-breakpoint
CREATE INDEX "decision_log_hash_idx" ON "decision_log" USING btree ("input_hash");--> statement-breakpoint
CREATE INDEX "decision_log_status_idx" ON "decision_log" USING btree ("status");