-- Allow users to keep more than one key for the same AI provider.
DROP INDEX IF EXISTS "ai_connections_userId_provider_key";
ALTER TABLE "ai_connections" ADD COLUMN IF NOT EXISTS "label" TEXT;
CREATE INDEX IF NOT EXISTS "ai_connections_userId_provider_idx" ON "ai_connections"("userId", "provider");
