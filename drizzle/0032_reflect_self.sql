CREATE TABLE "ai_reflect_conversation" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text,
	"summary" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"closed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "ai_reflect_message" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" text NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"meta" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_reflect_profile" (
	"user_id" text PRIMARY KEY NOT NULL,
	"tone_notes" text,
	"habit_notes" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_reflect_report" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"range_start" timestamp,
	"range_end" timestamp,
	"past_archive_id" text,
	"present_note" text,
	"links" jsonb,
	"conversation_id" text,
	"archive_item_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_reflect_conversation" ADD CONSTRAINT "ai_reflect_conversation_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_reflect_message" ADD CONSTRAINT "ai_reflect_message_conversation_id_ai_reflect_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."ai_reflect_conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_reflect_profile" ADD CONSTRAINT "ai_reflect_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_reflect_report" ADD CONSTRAINT "ai_reflect_report_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_reflect_report" ADD CONSTRAINT "ai_reflect_report_past_archive_id_archive_item_id_fk" FOREIGN KEY ("past_archive_id") REFERENCES "public"."archive_item"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_reflect_report" ADD CONSTRAINT "ai_reflect_report_conversation_id_ai_reflect_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."ai_reflect_conversation"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_reflect_report" ADD CONSTRAINT "ai_reflect_report_archive_item_id_archive_item_id_fk" FOREIGN KEY ("archive_item_id") REFERENCES "public"."archive_item"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_reflect_conversation_user_updated_idx" ON "ai_reflect_conversation" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "ai_reflect_message_conversation_created_idx" ON "ai_reflect_message" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "ai_reflect_report_user_created_idx" ON "ai_reflect_report" USING btree ("user_id","created_at");