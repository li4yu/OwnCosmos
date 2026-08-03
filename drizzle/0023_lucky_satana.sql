ALTER TABLE "user" ADD COLUMN "focus_dnd" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "focus_countdown_default_ms" integer DEFAULT 1500000 NOT NULL;