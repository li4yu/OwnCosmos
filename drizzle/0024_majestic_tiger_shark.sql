CREATE TABLE "essay_folder" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "essay" ADD COLUMN "folder_id" text;--> statement-breakpoint
ALTER TABLE "essay_folder" ADD CONSTRAINT "essay_folder_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "essay_folder_user_updated_idx" ON "essay_folder" USING btree ("user_id","updated_at");--> statement-breakpoint
ALTER TABLE "essay" ADD CONSTRAINT "essay_folder_id_essay_folder_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."essay_folder"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "essay_user_folder_archived_idx" ON "essay" USING btree ("user_id","folder_id","archived_at");