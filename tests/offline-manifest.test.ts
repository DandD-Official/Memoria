import { expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ user: vi.fn(), notes: vi.fn(), reviewers: vi.fn(), quizzes: vi.fn(), collections: vi.fn(), workspaces: vi.fn(), shares: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ requireUserOrNull: mocks.user }));
vi.mock("@/lib/api/handler", () => ({ withApiErrorHandling: (handler: unknown) => handler }));
vi.mock("@/lib/db", () => ({ prisma: {
  note: { findMany: mocks.notes }, reviewer: { findMany: mocks.reviewers }, quiz: { findMany: mocks.quizzes },
  shareCollection: { findMany: mocks.collections }, workspace: { findMany: mocks.workspaces }, resourceShare: { findMany: mocks.shares },
} }));
import { GET } from "@/app/api/offline/manifest/route";

it("includes Practice, Together, book content, workspaces and editable documents", async () => {
  mocks.user.mockResolvedValue({ id: "alice" });
  mocks.notes.mockResolvedValue([{ id: "n1" }]); mocks.reviewers.mockResolvedValue([{ id: "r1" }]); mocks.quizzes.mockResolvedValue([{ id: "q1" }]);
  mocks.collections.mockResolvedValue([{ id: "b1", kind: "BOOK" }, { id: "nb1", kind: "NOTEBOOK" }]); mocks.workspaces.mockResolvedValue([{ id: "w1" }]);
  mocks.shares.mockResolvedValue([{ resourceType: "NOTE", resourceId: "shared1" }]);
  const response = await GET(new Request("https://memoria.test/api/offline/manifest"));
  const data = await response.json();
  expect(data.paths).toEqual(expect.arrayContaining(["/study", "/books", "/notebooks", "/books/b1", "/notebooks/nb1", "/workspaces/w1", "/quizzes/q1", "/study/flashcards/r1", "/notes/shared1"]));
  expect(data.documents).toEqual(expect.arrayContaining(["/api/notes/n1", "/api/reviewers/r1", "/api/notes/shared1"]));
  expect(data.apis).toEqual(expect.arrayContaining(["/api/collections/b1/document", "/api/workspaces/w1"]));
  expect(mocks.notes).toHaveBeenCalledWith(expect.objectContaining({ where: { ownerId: "alice" } }));
  expect(mocks.shares).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "alice" } }));
});

it("requires an authenticated account before enumerating private pages", async () => {
  mocks.user.mockResolvedValue(null);
  expect((await GET(new Request("https://memoria.test/api/offline/manifest"))).status).toBe(401);
});
