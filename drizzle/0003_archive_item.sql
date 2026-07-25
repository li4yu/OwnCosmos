CREATE TABLE "archive_item" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"source_module" text NOT NULL,
	"source_essay_id" text,
	"archive_reason" text NOT NULL,
	"archived_at" timestamp NOT NULL,
	"source_created_at" timestamp NOT NULL,
	"source_updated_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "archive_item" ADD CONSTRAINT "archive_item_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "archive_item" ADD CONSTRAINT "archive_item_source_essay_id_essay_id_fk" FOREIGN KEY ("source_essay_id") REFERENCES "public"."essay"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "archive_item_user_archived_idx" ON "archive_item" USING btree ("user_id","archived_at");--> statement-breakpoint
CREATE INDEX "archive_item_user_type_idx" ON "archive_item" USING btree ("user_id","type");