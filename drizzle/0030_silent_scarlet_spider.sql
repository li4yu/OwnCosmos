ALTER TABLE "ai_companion_pref" ADD COLUMN "companion_name" text DEFAULT '小宇' NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_companion_pref" ADD COLUMN "tone" text DEFAULT 'warm' NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_companion_pref" ADD COLUMN "user_address" text DEFAULT '你' NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_companion_pref" ADD COLUMN "persona_ready" boolean DEFAULT false NOT NULL;