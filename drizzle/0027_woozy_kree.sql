CREATE TABLE "essay_image" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"essay_id" text NOT NULL,
	"url" text NOT NULL,
	"sort_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "archive_item" ADD COLUMN "body_format" text DEFAULT 'plain' NOT NULL;--> statement-breakpoint
ALTER TABLE "archive_topic_essay" ADD COLUMN "body_format" text DEFAULT 'plain' NOT NULL;--> statement-breakpoint
ALTER TABLE "essay" ADD COLUMN "body_format" text DEFAULT 'plain' NOT NULL;--> statement-breakpoint
ALTER TABLE "essay_image" ADD CONSTRAINT "essay_image_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "essay_image" ADD CONSTRAINT "essay_image_essay_id_essay_id_fk" FOREIGN KEY ("essay_id") REFERENCES "public"."essay"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "essay_image_user_essay_idx" ON "essay_image" USING btree ("user_id","essay_id");