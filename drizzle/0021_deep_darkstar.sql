ALTER TABLE "focus_session" ADD COLUMN "habit_id" text;--> statement-breakpoint
ALTER TABLE "focus_session" ADD CONSTRAINT "focus_session_habit_id_daily_habit_id_fk" FOREIGN KEY ("habit_id") REFERENCES "public"."daily_habit"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "focus_session_user_habit_idx" ON "focus_session" USING btree ("user_id","habit_id");