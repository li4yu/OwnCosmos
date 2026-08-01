ALTER TABLE "archive_item" ALTER COLUMN "in_knowledge" SET DEFAULT true;--> statement-breakpoint
UPDATE "archive_item"
SET
  "in_knowledge" = true,
  "kept_at" = COALESCE("kept_at", "archived_at")
WHERE "type" <> 'memory_fragment'
  AND "in_knowledge" = false;
