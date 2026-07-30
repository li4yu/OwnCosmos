ALTER TABLE "archive_item" ADD COLUMN "source_series_id" text;--> statement-breakpoint
ALTER TABLE "archive_item" ADD COLUMN "cycle_count" integer;--> statement-breakpoint
ALTER TABLE "archive_item" ADD COLUMN "cycle_unit" text;--> statement-breakpoint
CREATE UNIQUE INDEX "archive_item_user_series_uidx" ON "archive_item" USING btree ("user_id","source_series_id");