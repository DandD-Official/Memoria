-- Additive compatibility migration for the Books UI. Existing Collections
-- remain intact and are surfaced as Books until the dedicated model migration.
ALTER TABLE "share_collections"
  ADD COLUMN "subtitle" TEXT,
  ADD COLUMN "tocTitle" TEXT NOT NULL DEFAULT 'Contents',
  ADD COLUMN "linkPermission" "Permission" NOT NULL DEFAULT 'VIEW',
  ADD COLUMN "isFavorite" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "share_collection_members"
  ADD COLUMN "permission" "Permission" NOT NULL DEFAULT 'VIEW';

CREATE TABLE "share_collection_progress" (
  "id" TEXT NOT NULL,
  "collectionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "lastItemId" TEXT,
  "lastAccessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "share_collection_progress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "share_collection_progress_collectionId_userId_key" ON "share_collection_progress"("collectionId", "userId");
CREATE INDEX "share_collection_progress_userId_lastAccessedAt_idx" ON "share_collection_progress"("userId", "lastAccessedAt");
ALTER TABLE "share_collection_progress" ADD CONSTRAINT "share_collection_progress_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "share_collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "share_collection_progress" ADD CONSTRAINT "share_collection_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
