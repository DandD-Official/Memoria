import { z } from "zod";

export const WORKSPACE_LIFETIME_MS = 3 * 24 * 60 * 60 * 1000;
export const MAX_WORKSPACE_NOTES = 20;
export const MAX_WORKSPACE_MEMBERS = 20;
export const MAX_OWNED_WORKSPACES = 5;
export const MAX_NOTE_CHARS = 100_000;
const title = z.string().trim().min(1, "Give this a title.").max(150);
const id = z.string().min(1).max(100);
export const createWorkspaceSchema = z.object({ title });
export const workspaceActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("rename"), title }),
  z.object({ action: z.literal("add-note"), title }),
  z.object({ action: z.literal("save-note"), noteId: id, title, content: z.string().max(MAX_NOTE_CHARS), version: z.number().int().positive() }),
  z.object({ action: z.literal("delete-note"), noteId: id, version: z.number().int().positive() }),
  z.object({ action: z.literal("invite"), email: z.string().trim().email().transform(value => value.toLowerCase()), permission: z.enum(["VIEW", "EDIT"]) }),
  z.object({ action: z.literal("revoke"), userId: id }),
]);
export type WorkspaceAction = z.infer<typeof workspaceActionSchema>;
export interface WorkspaceNoteData { id: string; title: string; content: string; version: number; updatedAt: string }
export interface WorkspaceData {
  id: string; title: string; ownerId: string; expiresAt: string; updatedAt: string; version: number;
  permission: "OWNER" | "EDIT" | "VIEW";
  notes: WorkspaceNoteData[];
  members: { userId: string; permission: "EDIT" | "VIEW"; user: { name: string; email: string } }[];
}
export function workspaceExpiry(createdAt = new Date()) { return new Date(createdAt.getTime() + WORKSPACE_LIFETIME_MS); }
