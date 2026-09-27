import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { compressText, decompressText } from "@/lib/compression";
import { MAX_OWNED_WORKSPACES, MAX_WORKSPACE_MEMBERS, MAX_WORKSPACE_NOTES, workspaceExpiry, type WorkspaceAction } from "./schema";

export class WorkspaceError extends Error {
  constructor(message: string, public status: number, public details?: Record<string, unknown>) { super(message); }
}
export async function workspaceTransaction<T>(run: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await prisma.$transaction(run, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); }
    catch (error) {
      if (attempt < 3 && error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") continue;
      throw error;
    }
  }
}

export async function accessibleWorkspace(tx: Prisma.TransactionClient, id: string, userId: string) {
  const workspace = await tx.workspace.findFirst({ where: { id, OR: [{ ownerId: userId }, { members: { some: { userId } } }] }, include: { members: { include: { user: { select: { name: true, email: true } } } } } });
  if (!workspace) throw new WorkspaceError("Workspace not found or access removed.", 404);
  if (workspace.expiresAt.getTime() <= Date.now()) throw new WorkspaceError("This workspace has expired after three days.", 410);
  const permission = workspace.ownerId === userId ? "OWNER" : workspace.members.find(member => member.userId === userId)!.permission;
  return { ...workspace, permission };
}

export async function readWorkspace(id: string, userId: string, knownVersion?: string | null) {
  return workspaceTransaction(async tx => {
    const workspace = await accessibleWorkspace(tx, id, userId);
    if (knownVersion === `"${workspace.version}"`) return null;
    const notes = await tx.workspaceNote.findMany({ where: { workspaceId: id }, orderBy: [{ updatedAt: "asc" }, { id: "asc" }] });
    return { ...workspace, notes: notes.map(note => ({ ...note, content: decompressText(note.content) })) };
  });
}

export async function createWorkspace(userId: string, title: string) {
  return workspaceTransaction(async tx => {
    if (await tx.workspace.count({ where: { ownerId: userId, expiresAt: { gt: new Date() } } }) >= MAX_OWNED_WORKSPACES) throw new WorkspaceError("You can have up to five active workspaces. Delete one before creating another.", 409);
    return tx.workspace.create({ data: { ownerId: userId, title, expiresAt: workspaceExpiry(), notes: { create: { title: "First note", content: compressText("") } } }, select: { id: true } });
  });
}

export async function changeWorkspace(id: string, userId: string, action: WorkspaceAction) {
  return workspaceTransaction(async tx => {
    const workspace = await accessibleWorkspace(tx, id, userId);
    const ownerOnly = ["rename", "invite", "revoke"].includes(action.action);
    if (workspace.permission === "VIEW" || (ownerOnly && workspace.permission !== "OWNER")) throw new WorkspaceError("You do not have permission to make this change.", 403);
    // Every write participates in the workspace transaction, including access changes.
    // The expiry is immutable and checked again while obtaining the write lock.
    const active = await tx.workspace.updateMany({ where: { id, expiresAt: { gt: new Date() } }, data: { updatedAt: new Date(), version: { increment: 1 } } });
    if (!active.count) throw new WorkspaceError("This workspace has expired.", 410);
    if (action.action === "rename") await tx.workspace.update({ where: { id }, data: { title: action.title } });
    if (action.action === "add-note") {
      if (await tx.workspaceNote.count({ where: { workspaceId: id } }) >= MAX_WORKSPACE_NOTES) throw new WorkspaceError("This workspace can hold up to 20 notes.", 409);
      return tx.workspaceNote.create({ data: { workspaceId: id, title: action.title, content: compressText("") }, select: { id: true } });
    }
    if (action.action === "save-note" || action.action === "delete-note") {
      const note = await tx.workspaceNote.findFirst({ where: { id: action.noteId, workspaceId: id } });
      if (!note) throw new WorkspaceError("This note was removed. Copy your draft before leaving.", 404);
      if (note.version !== action.version) throw new WorkspaceError("Someone saved a newer version. Review both versions before saving.", 409, { currentNote: { ...note, content: decompressText(note.content) } });
      if (action.action === "delete-note") await tx.workspaceNote.delete({ where: { id: note.id } });
      else {
        const saved = await tx.workspaceNote.update({ where: { id: note.id }, data: { title: action.title, content: compressText(action.content), version: { increment: 1 } } });
        return { ...saved, content: decompressText(saved.content) };
      }
    }
    if (action.action === "invite") {
      const user = await tx.user.findUnique({ where: { email: action.email }, select: { id: true } });
      if (!user) throw new WorkspaceError("Ask this person to create a Memoria account first, then invite them again.", 404);
      if (user.id === workspace.ownerId) throw new WorkspaceError("The owner already has full access.", 400);
      if (!workspace.members.some(member => member.userId === user.id) && workspace.members.length >= MAX_WORKSPACE_MEMBERS) throw new WorkspaceError("A workspace can have up to 20 collaborators.", 409);
      await tx.workspaceMember.upsert({ where: { workspaceId_userId: { workspaceId: id, userId: user.id } }, create: { workspaceId: id, userId: user.id, permission: action.permission }, update: { permission: action.permission } });
    }
    if (action.action === "revoke") await tx.workspaceMember.deleteMany({ where: { workspaceId: id, userId: action.userId } });
    return { id };
  });
}

export async function deleteWorkspace(id: string, userId: string) {
  return workspaceTransaction(async tx => {
    const workspace = await accessibleWorkspace(tx, id, userId);
    if (workspace.permission !== "OWNER") throw new WorkspaceError("Only the owner can delete this workspace.", 403);
    await tx.workspace.delete({ where: { id } });
  });
}
