ALTER TABLE "inmeet_submissions" ADD COLUMN "status" text DEFAULT 'submitted' NOT NULL;--> statement-breakpoint
ALTER TABLE "inmeet_submissions" ADD COLUMN "am_notitie" text;--> statement-breakpoint
ALTER TABLE "inmeet_submissions" ADD COLUMN "am_checked_by" uuid;--> statement-breakpoint
ALTER TABLE "inmeet_submissions" ADD COLUMN "am_checked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "inmeet_submissions" ADD COLUMN "aannemer_id" uuid;--> statement-breakpoint
ALTER TABLE "inmeet_submissions" ADD CONSTRAINT "inmeet_submissions_am_checked_by_employees_id_fk" FOREIGN KEY ("am_checked_by") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inmeet_submissions" ADD CONSTRAINT "inmeet_submissions_aannemer_id_employees_id_fk" FOREIGN KEY ("aannemer_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inmeet_submissions_status_idx" ON "inmeet_submissions" USING btree ("status","submitted_at");--> statement-breakpoint
CREATE INDEX "inmeet_submissions_aannemer_idx" ON "inmeet_submissions" USING btree ("aannemer_id","status");