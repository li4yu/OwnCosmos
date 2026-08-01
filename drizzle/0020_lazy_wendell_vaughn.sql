ALTER TABLE "essay" ADD COLUMN "source_focus_session_id" text;--> statement-breakpoint
ALTER TABLE "focus_session" ADD COLUMN "target_ms" integer;--> statement-breakpoint
ALTER TABLE "focus_session" ADD COLUMN "plan_id" text;--> statement-breakpoint
ALTER TABLE "essay" ADD CONSTRAINT "essay_source_focus_session_id_focus_session_id_fk" FOREIGN KEY ("source_focus_session_id") REFERENCES "public"."focus_session"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "focus_session" ADD CONSTRAINT "focus_session_plan_id_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plan"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "essay_user_source_focus_idx" ON "essay" USING btree ("user_id","source_focus_session_id");--> statement-breakpoint
CREATE INDEX "focus_session_user_plan_idx" ON "focus_session" USING btree ("user_id","plan_id");