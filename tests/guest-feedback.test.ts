import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ user: vi.fn(), limit: vi.fn(), gate: vi.fn(), add: vi.fn(), token: vi.fn() }));
vi.mock("@/lib/api/handler", () => ({ withApiErrorHandling: (handler: unknown) => handler }));
vi.mock("@/lib/auth/session", () => ({ requireUserOrNull: mocks.user }));
vi.mock("@/lib/guest-rate-limit", () => ({ guestRateLimit: mocks.limit }));
vi.mock("@/lib/db", () => ({ prisma: { shareCollection: { findUnique: mocks.gate } } }));
vi.mock("@/lib/share-collections-repo", () => ({ addFeedback: mocks.add }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("@/lib/collections/access", () => ({ collectionAccessCookieName: () => "book", validCollectionAccessToken: mocks.token }));
import { POST } from "@/app/api/collections/public/[slug]/feedback/route";

function post(message = "Helpful!", query = "", parentId?: string) {
  return POST(new Request(`http://localhost/api/collections/public/book/feedback${query}`, { method: "POST", body: JSON.stringify({ message, authorName: "Guest", parentId }) }), { params: Promise.resolve({ slug: "book" }) });
}

describe("guest feedback", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.user.mockResolvedValue(null);
    mocks.gate.mockResolvedValue({ id: "book", ownerId: "owner", passwordHash: null });
    mocks.add.mockResolvedValue({ id: "comment", authorUserId: null });
  });
  it("accepts guest feedback and replies without requiring an account", async () => {
    expect((await post(" A reply ", "", "parent")).status).toBe(201);
    expect(mocks.limit).toHaveBeenCalled();
    expect(mocks.add).toHaveBeenCalledWith(expect.objectContaining({ message: "A reply", parentId: "parent", authorUserId: undefined }));
  });
  it("posts guest preview as a guest even when an owner session exists", async () => {
    mocks.user.mockResolvedValue({ id: "owner", name: "Owner" });
    expect((await post("Helpful", "?view=guest")).status).toBe(201);
    expect(mocks.limit).toHaveBeenCalled();
    expect(mocks.add).toHaveBeenCalledWith(expect.objectContaining({ authorName: "Guest", authorUserId: undefined }));
  });
  it("retains password protection for guest preview", async () => {
    mocks.user.mockResolvedValue({ id: "owner" });
    mocks.gate.mockResolvedValue({ id: "book", ownerId: "owner", passwordHash: "locked" });
    expect((await post("Helpful", "?view=guest")).status).toBe(401);
    expect(mocks.add).not.toHaveBeenCalled();
  });
  it("rejects whitespace and respects guest rate limits", async () => {
    expect((await post("  ")).status).toBe(400);
    mocks.limit.mockResolvedValue(new Response(null, { status: 429 }));
    expect((await post()).status).toBe(429);
    expect(mocks.add).not.toHaveBeenCalled();
  });
});
