CREATE TABLE "archive_topic_essay" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"archive_item_id" text NOT NULL,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"mood" text,
	"source_essay_id" text,
	"source_created_at" timestamp NOT NULL,
	"source_updated_at" timestamp NOT NULL,
	"sort_index" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "archive_topic_essay" ADD CONSTRAINT "archive_topic_essay_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "archive_topic_essay" ADD CONSTRAINT "archive_topic_essay_archive_item_id_archive_item_id_fk" FOREIGN KEY ("archive_item_id") REFERENCES "public"."archive_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "archive_topic_essay" ADD CONSTRAINT "archive_topic_essay_source_essay_id_essay_id_fk" FOREIGN KEY ("source_essay_id") REFERENCES "public"."essay"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "archive_topic_essay_user_archive_idx" ON "archive_topic_essay" USING btree ("user_id","archive_item_id");