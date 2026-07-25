CREATE TABLE "focus_session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"mode" text DEFAULT 'forward' NOT NULL,
	"status" text NOT NULL,
	"accumulated_ms" integer DEFAULT 0 NOT NULL,
	"running_since" timestamp,
	"started_at" timestamp NOT NULL,
	"ended_at" timestamp,
	"title" text DEFAULT '' NOT NULL,
	"reflection" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "archive_item" ADD COLUMN "source_focus_session_id" text;--> statement-breakpoint
ALTER TABLE "focus_session" ADD CONSTRAINT "focus_session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "focus_session_user_status_idx" ON "focus_session" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "focus_session_user_ended_idx" ON "focus_session" USING btree ("user_id","ended_at");--> statement-breakpoint
ALTER TABLE "archive_item" ADD CONSTRAINT "archive_item_source_focus_session_id_focus_session_id_fk" FOREIGN KEY ("source_focus_session_id") REFERENCES "public"."focus_session"("id") ON DELETE set null ON UPDATE no action;