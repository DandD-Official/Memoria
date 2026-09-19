import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  note: { findMany: vi.fn() }, reviewer: { findMany: vi.fn() }, quiz: { findMany: vi.fn() },
  diagram: { findMany: vi.fn() }, shareCollection: { findMany: vi.fn() },
}));
const auth = vi.hoisted(() => ({ requireUserOrNull: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: db }));
vi.mock("@/lib/auth/session", () => auth);

import { GET } from "@/app/api/search/route";

describe("library search authorization and result groups", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.requireUserOrNull.mockResolvedValue({ id: "reader-1" });
    for (const model of Object.values(db)) model.findMany.mockResolvedValue([]);
  });

  it("rejects signed-out search before querying any resources", async () => {
    auth.requireUserOrNull.mockResolvedValue(null);
    const response = await GET(new Request("http://localhost/api/search?q=biology"));
    expect(response.status).toBe(401);
    for (const model of Object.values(db)) expect(model.findMany).not.toHaveBeenCalled();
  });

  it.each(["?q=biology", "?recommended=1"])("keeps every group private to the caller for %s", async query => {
    db.diagram.findMany.mockResolvedValue([{ id: "diagram-1", title: "Cell structure" }]);
    db.shareCollection.findMany.mockResolvedValue([{ id: "book-1", title: "Biology" }]);
    const response = await GET(new Request(`http://localhost/api/search${query}`));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.diagrams[0].id).toBe("diagram-1");
    expect(body.collections[0].id).toBe("book-1");
    for (const model of Object.values(db)) {
      const args = model.findMany.mock.calls[0][0];
      expect(args.where.ownerId).toBe("reader-1");
      expect(args.select.content).toBeUndefined();
      expect(args.select.data).toBeUndefined();
      expect(args.select.passwordHash).toBeUndefined();
    }
    for (const model of [db.note, db.reviewer, db.quiz]) {
      expect(model.findMany.mock.calls[0][0].where.archivedAt).toBeNull();
    }
  });

  it("keeps empty searches empty unless recommendations were requested", async () => {
    const response = await GET(new Request("http://localhost/api/search?q=%20%20"));
    expect(await response.json()).toEqual({ notes: [], reviewers: [], quizzes: [], diagrams: [], collections: [] });
    for (const model of Object.values(db)) expect(model.findMany).not.toHaveBeenCalled();
  });

  it("preserves tag and original filename searches while adding diagrams and books", async () => {
    await GET(new Request("http://localhost/api/search?q=%20biology%20"));
    const match = { contains: "biology", mode: "insensitive" };
    for (const model of [db.note, db.reviewer, db.quiz]) {
      expect(model.findMany.mock.calls[0][0].where.OR).toContainEqual({ tags: { some: { tag: { name: match } } } });
    }
    expect(db.note.findMany.mock.calls[0][0].where.OR).toContainEqual({ originalFilename: match });
    expect(db.diagram.findMany.mock.calls[0][0].where.title).toEqual(match);
    expect(db.shareCollection.findMany.mock.calls[0][0].where.OR).toContainEqual({ subtitle: match });
  });
});
