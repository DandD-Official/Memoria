import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ user: vi.fn(), access: vi.fn(), entry: vi.fn(), progress: vi.fn(), save: vi.fn(), items: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ requireUserOrNull: mocks.user }));
vi.mock("@/lib/share-collections-repo", () => ({ getPublicCollectionBySlug: mocks.access }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("@/lib/db", () => ({ prisma: { shareCollection: { findUnique: mocks.entry }, shareCollectionProgress: { findUnique: mocks.progress, upsert: mocks.save }, shareCollectionItem: { findMany: mocks.items } } }));
import { GET, PATCH } from "@/app/api/collections/[id]/progress/route";
const context = { params: Promise.resolve({ id: "book" }) };
const mark = { id: "mark", chapterId: "chapter", pageOffset: 2, label: "Remember this" };
const request = (body: unknown) => new Request("http://localhost/api/collections/book/progress", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
describe("book reading progress access", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.user.mockResolvedValue({ id: "reader" });
    mocks.entry.mockResolvedValue({ slug: "shared-book" });
    mocks.access.mockResolvedValue({ id: "book" });
    mocks.progress.mockResolvedValue({ lastItemId: "chapter", bookmarks: [mark] });
    mocks.items.mockResolvedValue([{ id: "chapter" }]);
    mocks.save.mockResolvedValue({ bookmarks: [mark] });
  });
  it("loads only the signed-in reader's saved bookmarks", async () => {
    const response = await GET(new Request("http://localhost"), context);
    expect(response.status).toBe(200);
    expect((await response.json()).bookmarks).toEqual([mark]);
    expect(mocks.progress).toHaveBeenCalledWith({ where: { collectionId_userId: { collectionId: "book", userId: "reader" } } });
  });
  it("blocks unauthenticated sync and readers without book access", async () => {
    mocks.user.mockResolvedValueOnce(null);
    expect((await PATCH(request({ bookmarks: [mark] }), context)).status).toBe(401);
    mocks.access.mockResolvedValue(null);
    expect((await PATCH(request({ bookmarks: [mark] }), context)).status).toBe(404);
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("rejects bookmarks for chapters outside the collection", async () => {
    mocks.items.mockResolvedValue([]);
    expect((await PATCH(request({ bookmarks: [mark] }), context)).status).toBe(400);
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("saves bookmarks without overwriting the last-read chapter", async () => {
    expect((await PATCH(request({ bookmarks: [mark] }), context)).status).toBe(200);
    const data = mocks.save.mock.calls[0][0];
    expect(data.where.collectionId_userId.userId).toBe("reader");
    expect(data.update.bookmarks).toEqual([mark]);
    expect(data.update).not.toHaveProperty("lastItemId");
  });
});
