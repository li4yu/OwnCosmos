CREATE TABLE "archive_item_tag" (
	"user_id" text NOT NULL,
	"archive_item_id" text NOT NULL,
	"tag_id" text NOT NULL,
	"name_snapshot" text NOT NULL,
	CONSTRAINT "archive_item_tag_archive_item_id_tag_id_pk" PRIMARY KEY("archive_item_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "essay_tag" (
	"user_id" text NOT NULL,
	"essay_id" text NOT NULL,
	"tag_id" text NOT NULL,
	CONSTRAINT "essay_tag_essay_id_tag_id_pk" PRIMARY KEY("essay_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "material" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"body" text NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"source_kind" text NOT NULL,
	"source_essay_id" text,
	"source_archive_item_id" text,
	"source_plan_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_tag" (
	"user_id" text NOT NULL,
	"plan_id" text NOT NULL,
	"tag_id" text NOT NULL,
	CONSTRAINT "plan_tag_plan_id_tag_id_pk" PRIMARY KEY("plan_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "tag" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "archive_item" ADD COLUMN "mood" text;--> statement-breakpoint
ALTER TABLE "essay" ADD COLUMN "mood" text;--> statement-breakpoint
ALTER TABLE "plan" ADD COLUMN "mood" text;--> statement-breakpoint
ALTER TABLE "archive_item_tag" ADD CONSTRAINT "archive_item_tag_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "archive_item_tag" ADD CONSTRAINT "archive_item_tag_archive_item_id_archive_item_id_fk" FOREIGN KEY ("archive_item_id") REFERENCES "public"."archive_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "archive_item_tag" ADD CONSTRAINT "archive_item_tag_tag_id_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "essay_tag" ADD CONSTRAINT "essay_tag_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "essay_tag" ADD CONSTRAINT "essay_tag_essay_id_essay_id_fk" FOREIGN KEY ("essay_id") REFERENCES "public"."essay"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "essay_tag" ADD CONSTRAINT "essay_tag_tag_id_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material" ADD CONSTRAINT "material_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material" ADD CONSTRAINT "material_source_essay_id_essay_id_fk" FOREIGN KEY ("source_essay_id") REFERENCES "public"."essay"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material" ADD CONSTRAINT "material_source_archive_item_id_archive_item_id_fk" FOREIGN KEY ("source_archive_item_id") REFERENCES "public"."archive_item"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material" ADD CONSTRAINT "material_source_plan_id_plan_id_fk" FOREIGN KEY ("source_plan_id") REFERENCES "public"."plan"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_tag" ADD CONSTRAINT "plan_tag_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_tag" ADD CONSTRAINT "plan_tag_plan_id_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_tag" ADD CONSTRAINT "plan_tag_tag_id_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tag" ADD CONSTRAINT "tag_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "archive_item_tag_user_tag_idx" ON "archive_item_tag" USING btree ("user_id","tag_id");--> statement-breakpoint
CREATE INDEX "archive_item_tag_user_name_idx" ON "archive_item_tag" USING btree ("user_id","name_snapshot");--> statement-breakpoint
CREATE INDEX "essay_tag_user_tag_idx" ON "essay_tag" USING btree ("user_id","tag_id");--> statement-breakpoint
CREATE INDEX "material_user_created_idx" ON "material" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "plan_tag_user_tag_idx" ON "plan_tag" USING btree ("user_id","tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tag_user_name_uidx" ON "tag" USING btree ("user_id","name");--> statement-breakpoint
CREATE INDEX "tag_user_active_idx" ON "tag" USING btree ("user_id","active");--> statement-breakpoint
CREATE INDEX "archive_item_user_mood_idx" ON "archive_item" USING btree ("user_id","mood");--> statement-breakpoint
CREATE INDEX "essay_user_mood_idx" ON "essay" USING btree ("user_id","mood");--> statement-breakpoint
CREATE INDEX "plan_user_mood_idx" ON "plan" USING btree ("user_id","mood");