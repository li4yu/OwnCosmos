CREATE TABLE "plan" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" text DEFAULT 'once' NOT NULL,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"due_at" timestamp NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"archived_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "plan" ADD CONSTRAINT "plan_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "plan_user_archived_idx" ON "plan" USING btree ("user_id","archived_at");--> statement-breakpoint
CREATE INDEX "plan_user_due_idx" ON "plan" USING btree ("user_id","due_at");--> statement-breakpoint
CREATE INDEX "plan_user_status_idx" ON "plan" USING btree ("user_id","status");