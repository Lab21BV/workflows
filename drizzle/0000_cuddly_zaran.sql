CREATE TABLE "delegations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_am_id" uuid NOT NULL,
	"to_am_id" uuid NOT NULL,
	"valid_from" date NOT NULL,
	"valid_until" date NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"naam" text NOT NULL,
	"functie" text NOT NULL,
	"vestiging" text,
	"active" boolean DEFAULT true NOT NULL,
	"manager_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"zoho_order_id" text NOT NULL,
	"verkoper_id" uuid NOT NULL,
	"accountmanager_id" uuid NOT NULL,
	"snapshotted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "delegations" ADD CONSTRAINT "delegations_from_am_id_employees_id_fk" FOREIGN KEY ("from_am_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delegations" ADD CONSTRAINT "delegations_to_am_id_employees_id_fk" FOREIGN KEY ("to_am_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_manager_id_employees_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_assignments" ADD CONSTRAINT "order_assignments_verkoper_id_employees_id_fk" FOREIGN KEY ("verkoper_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_assignments" ADD CONSTRAINT "order_assignments_accountmanager_id_employees_id_fk" FOREIGN KEY ("accountmanager_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "delegations_from_idx" ON "delegations" USING btree ("from_am_id","valid_from","valid_until");--> statement-breakpoint
CREATE UNIQUE INDEX "employees_email_idx" ON "employees" USING btree ("email");--> statement-breakpoint
CREATE INDEX "employees_functie_idx" ON "employees" USING btree ("functie");--> statement-breakpoint
CREATE INDEX "employees_manager_idx" ON "employees" USING btree ("manager_id");--> statement-breakpoint
CREATE UNIQUE INDEX "order_assignments_zoho_order_idx" ON "order_assignments" USING btree ("zoho_order_id");--> statement-breakpoint
CREATE INDEX "order_assignments_am_idx" ON "order_assignments" USING btree ("accountmanager_id");--> statement-breakpoint
CREATE INDEX "order_assignments_verkoper_idx" ON "order_assignments" USING btree ("verkoper_id");