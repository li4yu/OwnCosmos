CREATE TABLE "essay" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"archived_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "essay" ADD CONSTRAINT "essay_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "essay_user_archived_idx" ON "essay" USING btree ("user_id","archived_at");--> statement-breakpoint
CREATE INDEX "essay_user_updated_idx" ON "essay" USING btree ("user_id","updated_at");