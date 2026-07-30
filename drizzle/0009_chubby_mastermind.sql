CREATE TABLE "daily_checkin" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"habit_id" text NOT NULL,
	"checkin_date" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_habit" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_task" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"plan_id" text NOT NULL,
	"title" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "plan" ALTER COLUMN "due_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "plan" ADD COLUMN "source_essay_id" text;--> statement-breakpoint
ALTER TABLE "plan" ADD COLUMN "cycle_unit" text;--> statement-breakpoint
ALTER TABLE "plan" ADD COLUMN "series_id" text;--> statement-breakpoint
ALTER TABLE "plan" ADD COLUMN "parent_plan_id" text;--> statement-breakpoint
ALTER TABLE "daily_checkin" ADD CONSTRAINT "daily_checkin_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_checkin" ADD CONSTRAINT "daily_checkin_habit_id_daily_habit_id_fk" FOREIGN KEY ("habit_id") REFERENCES "public"."daily_habit"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_habit" ADD CONSTRAINT "daily_habit_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_task" ADD CONSTRAINT "plan_task_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_task" ADD CONSTRAINT "plan_task_plan_id_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "daily_checkin_habit_date_uidx" ON "daily_checkin" USING btree ("habit_id","checkin_date");--> statement-breakpoint
CREATE INDEX "daily_checkin_user_date_idx" ON "daily_checkin" USING btree ("user_id","checkin_date");--> statement-breakpoint
CREATE INDEX "daily_habit_user_active_idx" ON "daily_habit" USING btree ("user_id","active");--> statement-breakpoint
CREATE INDEX "plan_task_user_plan_idx" ON "plan_task" USING btree ("user_id","plan_id");--> statement-breakpoint
CREATE INDEX "plan_task_plan_sort_idx" ON "plan_task" USING btree ("plan_id","sort_order");--> statement-breakpoint
ALTER TABLE "plan" ADD CONSTRAINT "plan_source_essay_id_essay_id_fk" FOREIGN KEY ("source_essay_id") REFERENCES "public"."essay"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan" ADD CONSTRAINT "plan_parent_plan_id_plan_id_fk" FOREIGN KEY ("parent_plan_id") REFERENCES "public"."plan"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "plan_user_source_essay_idx" ON "plan" USING btree ("user_id","source_essay_id");--> statement-breakpoint
CREATE INDEX "plan_user_kind_idx" ON "plan" USING btree ("user_id","kind");--> statement-breakpoint
CREATE INDEX "plan_user_series_idx" ON "plan" USING btree ("user_id","series_id");