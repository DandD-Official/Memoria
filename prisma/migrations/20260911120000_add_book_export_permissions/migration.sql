-- Additive Book export permissions. Existing sharing keeps its previous
-- behavior: public links remain exportable unless the owner turns exports off,
-- while newly created invitations default to no export access.
ALTER TABLE "share_collections"
  ADD COLUMN "allowExport" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "share_collection_members"
  ADD COLUMN "allowExport" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "share_collection_members"
  ALTER COLUMN "allowExport" SET DEFAULT false;
