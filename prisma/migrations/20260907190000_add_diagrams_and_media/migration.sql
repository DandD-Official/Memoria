-- Diagram and generated-media storage for MMD's durable visual content.
ALTER TYPE "ResourceType" ADD VALUE IF NOT EXISTS 'DIAGRAM';
CREATE TYPE "MediaKind" AS ENUM ('UPLOADED');

CREATE TABLE "diagrams" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "previewImage" BYTEA,
    "previewMimeType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "diagrams_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "media" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "kind" "MediaKind" NOT NULL,
    "mimeType" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "diagrams_ownerId_updatedAt_idx" ON "diagrams"("ownerId", "updatedAt");
CREATE INDEX "media_ownerId_createdAt_idx" ON "media"("ownerId", "createdAt");
ALTER TABLE "diagrams" ADD CONSTRAINT "diagrams_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "media" ADD CONSTRAINT "media_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
