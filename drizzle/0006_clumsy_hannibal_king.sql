ALTER TABLE "archive_item" ADD COLUMN "source_plan_id" text;--> statement-breakpoint
ALTER TABLE "plan" ADD COLUMN "remind_days" integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE "archive_item" ADD CONSTRAINT "archive_item_source_plan_id_plan_id_fk" FOREIGN KEY ("source_plan_id") REFERENCES "public"."plan"("id") ON DELETE set null ON UPDATE no action;