ALTER TABLE "essay" ADD COLUMN "source_plan_id" text;--> statement-breakpoint
ALTER TABLE "plan" ADD COLUMN "reminder_hidden_at" timestamp;--> statement-breakpoint
ALTER TABLE "essay" ADD CONSTRAINT "essay_source_plan_id_plan_id_fk" FOREIGN KEY ("source_plan_id") REFERENCES "public"."plan"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "essay_user_source_plan_idx" ON "essay" USING btree ("user_id","source_plan_id");--> statement-breakpoint
CREATE INDEX "plan_user_reminder_hidden_idx" ON "plan" USING btree ("user_id","reminder_hidden_at");