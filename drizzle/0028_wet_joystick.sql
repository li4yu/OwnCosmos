CREATE TABLE "rag_document" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"corpus" text NOT NULL,
	"source_kind" text NOT NULL,
	"source_id" text NOT NULL,
	"archive_type" text,
	"content_hash" text NOT NULL,
	"chunk_count" integer DEFAULT 0 NOT NULL,
	"embedding_model" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"last_synced_at" timestamp,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "ai_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "rag_document" ADD CONSTRAINT "rag_document_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "rag_document_corpus_source_uidx" ON "rag_document" USING btree ("corpus","source_id");--> statement-breakpoint
CREATE INDEX "rag_document_user_corpus_status_idx" ON "rag_document" USING btree ("user_id","corpus","status");--> statement-breakpoint
CREATE INDEX "rag_document_status_updated_idx" ON "rag_document" USING btree ("status","updated_at");