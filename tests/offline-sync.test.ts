import { beforeEach, describe, expect, it, vi } from "vitest";
import { compressText } from "@/lib/compression";

const mocks = vi.hoisted(() => ({ user: vi.fn(), edit: vi.fn(), find: vi.fn(), update: vi.fn(), revision: vi.fn(), share: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ requireUserOrNull: mocks.user }));
vi.mock("@/lib/permissions", () => ({ canEdit: mocks.edit }));
vi.mock("@/lib/api/handler", () => ({ withApiErrorHandling: (handler: unknown) => handler }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/lib/db", () => ({ prisma: { $transaction: async (callback: (tx: unknown) => unknown) => callback({
  note: { findUnique: mocks.find, updateMany: mocks.update }, reviewer: { findUnique: mocks.find, updateMany: mocks.update },
  resourceRevision: { create: mocks.revision }, resourceShare: { findUnique: mocks.share },
}) } }));
import { POST } from "@/app/api/offline/sync/route";

const timestamp = "2026-10-01T00:00:00.000Z";
const input = { userId: "alice", path: "/api/notes/n1", title: "Edited", content: "Edited content", updatedAt: timestamp };
const request = (body = input) => new Request("https://memoria.test/api/offline/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

beforeEach(() => {
  vi.resetAllMocks();
  mocks.user.mockResolvedValue({ id: "alice" }); mocks.edit.mockResolvedValue(true);
  mocks.find.mockResolvedValue({ id: "n1", ownerId: "alice", title: "Original", description: null, content: compressText("Original content"), updatedAt: new Date(timestamp) });
  mocks.update.mockResolvedValue({ count: 1 });
});

describe("offline sync authorization and concurrency", () => {
  it("rejects cross-origin uploads", async () => {
    const crossOrigin = request(); crossOrigin.headers.set("origin", "https://another.test");
    expect((await POST(crossOrigin)).status).toBe(403); expect(mocks.update).not.toHaveBeenCalled();
  });
  it("requires an online authenticated session", async () => {
    mocks.user.mockResolvedValue(null);
    expect((await POST(request())).status).toBe(401); expect(mocks.update).not.toHaveBeenCalled();
  });
  it("rejects account substitution and revoked edit access", async () => {
    expect((await POST(request({ ...input, userId: "bob" }))).status).toBe(403);
    mocks.edit.mockResolvedValue(false);
    expect((await POST(request())).status).toBe(403); expect(mocks.update).not.toHaveBeenCalled();
  });
  it("rejects unsupported endpoints and invalid data", async () => {
    expect((await POST(request({ ...input, path: "/api/account" }))).status).toBe(400);
    expect((await POST(request({ ...input, updatedAt: "yesterday" }))).status).toBe(400);
    expect((await POST(request({ ...input, title: "" }))).status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("writes with an atomic version condition and preserves the old revision", async () => {
    const response = await POST(request()); expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "n1", updatedAt: new Date(timestamp) } }));
    expect(mocks.revision).toHaveBeenCalledWith({ data: expect.objectContaining({ ownerId: "alice", resourceType: "NOTE", snapshot: { title: "Original", description: null, content: "Original content" } }) });
    expect(mocks.revalidate).toHaveBeenCalledWith("/notes/n1");
  });
  it("does not overwrite a newer document", async () => {
    mocks.find.mockResolvedValue({ id: "n1", ownerId: "alice", title: "Remote edit", content: compressText("Remote"), updatedAt: new Date("2026-10-02T00:00:00.000Z") });
    expect((await POST(request())).status).toBe(409); expect(mocks.update).not.toHaveBeenCalled();
  });
  it("handles a version race between reading and updating", async () => {
    mocks.update.mockResolvedValue({ count: 0 });
    expect((await POST(request())).status).toBe(409); expect(mocks.revision).not.toHaveBeenCalled();
  });
  it("accepts an already-applied retry without duplicating revisions", async () => {
    mocks.find.mockResolvedValue({ ownerId: "alice", title: input.title, content: compressText(input.content), updatedAt: new Date("2026-10-02T00:00:00.000Z") });
    expect((await POST(request())).status).toBe(200);
    expect(mocks.update).not.toHaveBeenCalled(); expect(mocks.revision).not.toHaveBeenCalled();
  });
  it("rechecks shared document permissions inside the transaction", async () => {
    mocks.find.mockResolvedValue({ id: "n1", ownerId: "bob", title: "Original", content: compressText("Original"), updatedAt: new Date(timestamp) });
    mocks.share.mockResolvedValue({ permission: "VIEW" });
    expect((await POST(request())).status).toBe(409); expect(mocks.update).not.toHaveBeenCalled();
  });
  it("applies existing reviewer validation during replay", async () => {
    expect((await POST(request({ ...input, path: "/api/reviewers/r1", content: "short" }))).status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
