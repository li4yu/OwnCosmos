ALTER TABLE "archive_item" ADD COLUMN "in_knowledge" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "archive_item" ADD COLUMN "kept_at" timestamp;--> statement-breakpoint
ALTER TABLE "archive_item" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "archive_item" ADD COLUMN "image_key" text;--> statement-breakpoint
ALTER TABLE "archive_item" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE INDEX "archive_item_user_knowledge_idx" ON "archive_item" USING btree ("user_id","in_knowledge");--> statement-breakpoint
CREATE INDEX "archive_item_user_type_archived_idx" ON "archive_item" USING btree ("user_id","type","archived_at");