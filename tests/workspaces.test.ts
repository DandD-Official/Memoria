import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
const mocks = vi.hoisted(() => ({
  user: vi.fn(), limited: vi.fn(),
  db: {
    workspace: { findFirst: vi.fn(), findMany: vi.fn(), count: vi.fn(), create: vi.fn(), updateMany: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    workspaceNote: { findFirst: vi.fn(), findMany: vi.fn(), count: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    workspaceMember: { upsert: vi.fn(), deleteMany: vi.fn() },
    user: { findUnique: vi.fn() }, $transaction: vi.fn(),
  },
}));
vi.mock("@/lib/db", () => ({ prisma: mocks.db }));
vi.mock("@/lib/auth/session", () => ({ requireUserOrNull: mocks.user }));
vi.mock("@/lib/rate-limit", () => ({ isRateLimited: mocks.limited }));
import { GET, PATCH, DELETE } from "@/app/api/workspaces/[id]/route";
import { POST as create, GET as list } from "@/app/api/workspaces/route";
import { compressText, decompressText } from "@/lib/compression";
import { createWorkspaceSchema, workspaceActionSchema, workspaceExpiry, WORKSPACE_LIFETIME_MS } from "@/lib/workspaces/schema";
import { workspaceTransaction } from "@/lib/workspaces/repository";
import { workspaceSvgPrompt } from "@/lib/workspaces/svg-prompt";

const context = { params: Promise.resolve({ id: "workspace-a" }) };
const request = (body?: unknown, method = "PATCH") => new Request("http://localhost/api/workspaces/workspace-a", { method, ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}) });
let workspace: { id: string; ownerId: string; title: string; version: number; expiresAt: Date; members: { userId: string; permission: "VIEW" | "EDIT"; user: { name: string; email: string } }[] };
let note: { id: string; workspaceId: string; title: string; content: Buffer; version: number; updatedAt: Date };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.user.mockResolvedValue({ id: "owner" }); mocks.limited.mockResolvedValue(false);
  workspace = { id: "workspace-a", ownerId: "owner", title: "Study", version: 1, expiresAt: new Date(Date.now() + WORKSPACE_LIFETIME_MS), members: [] };
  note = { id: "note-a", workspaceId: workspace.id, title: "Topic", content: compressText("Original"), version: 1, updatedAt: new Date() };
  mocks.db.$transaction.mockImplementation(async (run: (tx: unknown) => unknown) => run(mocks.db));
  mocks.db.workspace.findFirst.mockImplementation(async ({ where }) => {
    const user = where.OR[0].ownerId;
    return where.id === workspace.id && (user === workspace.ownerId || workspace.members.some(member => member.userId === user)) ? workspace : null;
  });
  mocks.db.workspaceNote.findFirst.mockImplementation(async ({ where }) => where.id === note.id && where.workspaceId === note.workspaceId ? { ...note } : null);
  mocks.db.workspaceNote.findMany.mockImplementation(async () => [{ ...note }]);
  mocks.db.workspaceNote.update.mockImplementation(async ({ data }) => { note = { ...note, title: data.title, content: data.content, version: note.version + 1 }; return note; });
  mocks.db.workspace.updateMany.mockResolvedValue({ count: 1 });
  mocks.db.workspace.count.mockResolvedValue(0); mocks.db.workspaceNote.count.mockResolvedValue(1);
  mocks.db.workspace.create.mockResolvedValue({ id: "created" });
  mocks.db.workspaceNote.create.mockResolvedValue({ id: "new-note" });
});

describe("workspace account and permission boundaries", () => {
  it("requires sign-in for every workspace endpoint", async () => {
    mocks.user.mockResolvedValue(null);
    for (const response of [await GET(request(undefined, "GET"), context), await PATCH(request({ action: "rename", title: "New" }), context), await DELETE(request(undefined, "DELETE"), context), await create(request({ title: "New" }, "POST")), await list(request(undefined, "GET"))]) expect(response.status).toBe(401);
    expect(mocks.db.$transaction).not.toHaveBeenCalled();
  });
  it("does not grant access just because another account knows the URL", async () => {
    mocks.user.mockResolvedValue({ id: "outsider" });
    const response = await GET(request(undefined, "GET"), context);
    expect(response.status).toBe(404); expect(mocks.db.workspaceNote.findMany).not.toHaveBeenCalled();
  });
  it("rejects access after an invitation is revoked, even with a matching ETag", async () => {
    mocks.user.mockResolvedValue({ id: "former-member" });
    const response = await GET(new Request("http://localhost/api/workspaces/workspace-a", { headers: { "If-None-Match": '"1"' } }), context);
    expect(response.status).toBe(404);
  });
  it("allows invited viewers to read but not write", async () => {
    workspace.members.push({ userId: "viewer", permission: "VIEW", user: { name: "Viewer", email: "viewer@example.test" } });
    mocks.user.mockResolvedValue({ id: "viewer" });
    const response = await GET(request(undefined, "GET"), context);
    expect(response.status).toBe(200); expect((await response.json()).notes[0].content).toBe("Original");
    const save = await PATCH(request({ action: "save-note", noteId: note.id, title: "Changed", content: "No", version: 1 }), context);
    expect(save.status).toBe(403); expect(mocks.db.workspaceNote.update).not.toHaveBeenCalled();
  });
  it.each(["invite", "revoke", "rename"])("reserves %s for the owner", async action => {
    workspace.members.push({ userId: "editor", permission: "EDIT", user: { name: "Editor", email: "editor@example.test" } });
    mocks.user.mockResolvedValue({ id: "editor" });
    const response = await PATCH(request({ action, title: "New", email: "other@example.test", permission: "EDIT", userId: "other" }), context);
    expect(response.status).toBe(403);
  });
  it("reserves workspace deletion for its owner", async () => {
    workspace.members.push({ userId: "editor", permission: "EDIT", user: { name: "Editor", email: "editor@example.test" } });
    mocks.user.mockResolvedValue({ id: "editor" });
    expect((await DELETE(request(undefined, "DELETE"), context)).status).toBe(403);
    expect(mocks.db.workspace.delete).not.toHaveBeenCalled();
  });
  it("will not update a note belonging to a different workspace", async () => {
    note.workspaceId = "workspace-b";
    expect((await PATCH(request({ action: "save-note", noteId: note.id, version: 1, title: "Stolen", content: "No" }), context)).status).toBe(404);
    expect(mocks.db.workspaceNote.update).not.toHaveBeenCalled();
  });
});

describe("workspace lifetime and size limits", () => {
  it("uses a fixed 72-hour deadline", () => {
    const created = new Date("2026-09-25T13:00:00Z");
    expect(workspaceExpiry(created).toISOString()).toBe("2026-09-28T13:00:00.000Z");
  });
  it("blocks reads and edits at the expiry boundary", async () => {
    workspace.expiresAt = new Date(Date.now() - 1);
    expect((await GET(request(undefined, "GET"), context)).status).toBe(410);
    expect((await PATCH(request({ action: "add-note", title: "Late" }), context)).status).toBe(410);
    expect(mocks.db.workspaceNote.create).not.toHaveBeenCalled();
  });
  it("checks expiry again when acquiring the workspace write lock", async () => {
    mocks.db.workspace.updateMany.mockResolvedValue({ count: 0 });
    expect((await PATCH(request({ action: "add-note", title: "Late" }), context)).status).toBe(410);
    expect(mocks.db.workspaceNote.create).not.toHaveBeenCalled();
  });
  it("does not accept lifetime or owner changes from clients", () => {
    const parsed = createWorkspaceSchema.parse({ title: "My workspace", ownerId: "other", expiresAt: "2099-01-01" });
    expect(parsed).toEqual({ title: "My workspace" });
    expect(workspaceActionSchema.safeParse({ action: "extend", expiresAt: "2099-01-01" }).success).toBe(false);
  });
  it("limits each account to five active owned workspaces", async () => {
    mocks.db.workspace.count.mockResolvedValue(5);
    expect((await create(request({ title: "Sixth" }, "POST"))).status).toBe(409);
    expect(mocks.db.workspace.create).not.toHaveBeenCalled();
  });
  it("limits a workspace to 20 notes", async () => {
    mocks.db.workspaceNote.count.mockResolvedValue(20);
    expect((await PATCH(request({ action: "add-note", title: "Too many" }), context)).status).toBe(409);
    expect(mocks.db.workspaceNote.create).not.toHaveBeenCalled();
  });
  it("rejects oversized notes before accessing the database", async () => {
    expect((await PATCH(request({ action: "save-note", noteId: note.id, version: 1, title: "Big", content: "x".repeat(100_001) }), context)).status).toBe(400);
    expect(mocks.db.$transaction).not.toHaveBeenCalled();
  });
});

describe("collaborative save integrity", () => {
  it("preserves a newer saved version when a stale editor saves", async () => {
    const first = await PATCH(request({ action: "save-note", noteId: note.id, version: 1, title: "First", content: "First editor" }), context);
    expect(first.status).toBe(200); expect((await first.json()).version).toBe(2);
    const stale = await PATCH(request({ action: "save-note", noteId: note.id, version: 1, title: "Second", content: "Second editor" }), context);
    expect(stale.status).toBe(409); expect((await stale.json()).currentNote.content).toBe("First editor");
    expect(decompressText(note.content)).toBe("First editor");
  });
  it("will not delete a note changed since the delete confirmation", async () => {
    note.version = 3;
    expect((await PATCH(request({ action: "delete-note", noteId: note.id, version: 1 }), context)).status).toBe(409);
    expect(mocks.db.workspaceNote.delete).not.toHaveBeenCalled();
  });
  it("skips note payloads when an authorized client's version is unchanged", async () => {
    const response = await GET(new Request("http://localhost/api/workspaces/workspace-a", { headers: { "If-None-Match": '"1"' } }), context);
    expect(response.status).toBe(304); expect(mocks.db.workspaceNote.findMany).not.toHaveBeenCalled();
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
  it("serializes permission changes and note edits, retrying database conflicts", async () => {
    mocks.db.$transaction.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError("serialization conflict", { code: "P2034", clientVersion: "5.22.0" }));
    await expect(workspaceTransaction(async () => "saved")).resolves.toBe("saved");
    expect(mocks.db.$transaction).toHaveBeenCalledTimes(2);
    expect(mocks.db.$transaction).toHaveBeenLastCalledWith(expect.any(Function), { isolationLevel: "Serializable" });
  });
  it("bounds retries when concurrent writes keep conflicting", async () => {
    mocks.db.$transaction.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("serialization conflict", { code: "P2034", clientVersion: "5.22.0" }));
    await expect(workspaceTransaction(async () => "saved")).rejects.toThrow("serialization conflict");
    expect(mocks.db.$transaction).toHaveBeenCalledTimes(4);
  });
});

describe("workspace SVG helper", () => {
  it("includes explicit requirements and the visual quality contract", () => {
    const prompt = workspaceSvgPrompt("Water cycle", "Show evaporation and units");
    expect(prompt).toContain("Water cycle"); expect(prompt).toContain("Show evaporation and units");
    expect(prompt).toContain("SVG QUALITY CONTRACT"); expect(prompt).toContain("do not invent data");
    expect(prompt).not.toContain("Source note");
  });
});
