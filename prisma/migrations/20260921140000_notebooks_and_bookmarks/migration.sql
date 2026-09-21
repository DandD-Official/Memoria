ALTER TABLE "share_collections" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'BOOK';
ALTER TABLE "share_collections" ADD COLUMN "subjects" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "share_collection_items" ADD COLUMN "subjectId" TEXT;
ALTER TABLE "share_collection_progress" ADD COLUMN "bookmarks" JSONB NOT NULL DEFAULT '[]';
