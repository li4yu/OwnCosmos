ALTER TABLE "user" ADD COLUMN "anniversary_remind" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "notify_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "notify_due_reminder" boolean DEFAULT true NOT NULL;