CREATE TABLE "workspaces" (
  "id" TEXT NOT NULL, "ownerId" TEXT NOT NULL, "title" TEXT NOT NULL, "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "workspace_notes" (
  "id" TEXT NOT NULL, "workspaceId" TEXT NOT NULL, "title" TEXT NOT NULL,
  "content" BYTEA NOT NULL, "version" INTEGER NOT NULL DEFAULT 1, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "workspace_notes_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "workspace_members" (
  "id" TEXT NOT NULL, "workspaceId" TEXT NOT NULL, "userId" TEXT NOT NULL,
  "permission" "Permission" NOT NULL DEFAULT 'EDIT',
  CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "workspaces_ownerId_idx" ON "workspaces"("ownerId");
CREATE INDEX "workspaces_expiresAt_idx" ON "workspaces"("expiresAt");
CREATE INDEX "workspace_notes_workspaceId_idx" ON "workspace_notes"("workspaceId");
CREATE INDEX "workspace_members_userId_idx" ON "workspace_members"("userId");
CREATE UNIQUE INDEX "workspace_members_workspaceId_userId_key" ON "workspace_members"("workspaceId", "userId");
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workspace_notes" ADD CONSTRAINT "workspace_notes_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
