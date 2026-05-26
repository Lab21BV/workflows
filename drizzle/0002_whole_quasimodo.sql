CREATE TABLE "inmeet_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"zoho_order_id" text NOT NULL,
	"payload" jsonb NOT NULL,
	"zoho_datums_id" text,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "inmeet_submissions_order_idx" ON "inmeet_submissions" USING btree ("zoho_order_id","submitted_at");