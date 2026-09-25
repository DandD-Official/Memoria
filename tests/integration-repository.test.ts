import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({ findUnique: vi.fn(), upsert: vi.fn(), findMany: vi.fn(), deleteMany: vi.fn(), updateMany: vi.fn(), lock: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: {
  integrationConnection: db,
  $transaction: (run: (tx: unknown) => Promise<unknown>) => run({ integrationConnection: db, $executeRaw: db.lock }),
} }));
import { connectionStatuses, disconnectProvider, getAccessToken, saveConnection, withConnectionToken } from "@/lib/integrations/repository";
import { encryptToken, decryptToken } from "@/lib/integrations/crypto";

beforeEach(() => { vi.resetAllMocks(); vi.stubEnv("INTEGRATION_ENCRYPTION_KEY", "test-encryption-key"); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
const connection = (expiresAt: Date | null = null) => ({ id: "c1", userId: "alice", provider: "NOTION", accessToken: encryptToken("old-token"), refreshToken: encryptToken("old-refresh"), expiresAt });

describe("per-user connections", () => {
  it("scopes status and disconnect to the server-selected user", async () => {
    db.findMany.mockResolvedValue([]);
    await connectionStatuses("alice");
    await disconnectProvider("bob", "notion");
    expect(db.findMany).toHaveBeenCalledWith({ where: { userId: "alice" }, select: { provider: true, metadata: true } });
    expect(db.deleteMany).toHaveBeenCalledWith({ where: { userId: "bob", provider: "NOTION" } });
  });
  it("never reuses another provider account's refresh token on relink", async () => {
    await saveConnection({ userId: "alice", provider: "google", accessToken: "new-account-token" });
    const args = db.upsert.mock.calls[0][0];
    expect(args.where).toEqual({ userId_provider: { userId: "alice", provider: "GOOGLE" } });
    expect(args.update.refreshToken).toBeNull();
    expect(decryptToken(args.update.accessToken)).toBe("new-account-token");
  });
  it("returns no credentials for an unconnected user", async () => {
    db.findUnique.mockResolvedValue(null);
    expect(await getAccessToken("bob", "google")).toBeNull();
    expect(db.findUnique).toHaveBeenCalledWith({ where: { userId_provider: { userId: "bob", provider: "GOOGLE" } } });
  });
  it("rotates Notion tokens once after a 401 without replacing metadata", async () => {
    db.findUnique.mockResolvedValue(connection());
    db.updateMany.mockResolvedValue({ count: 1 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ access_token: "renewed", refresh_token: "rotated" })));
    const operation = vi.fn().mockRejectedValueOnce(Object.assign(new Error("expired"), { status: 401 })).mockResolvedValueOnce("page");
    expect(await withConnectionToken("alice", "notion", operation)).toBe("page");
    expect(operation).toHaveBeenNthCalledWith(2, "renewed");
    const update = db.updateMany.mock.calls[0][0];
    expect(decryptToken(update.data.refreshToken)).toBe("rotated");
    expect(update.data).not.toHaveProperty("metadata");
    expect(update.where).toHaveProperty("accessToken");
    expect(db.lock).toHaveBeenCalledOnce();
  });
  it("does not resurrect a connection removed during refresh", async () => {
    db.findUnique.mockResolvedValue(connection(new Date(0)));
    db.updateMany.mockResolvedValue({ count: 0 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ access_token: "renewed" })));
    await expect(getAccessToken("alice", "notion")).rejects.toThrow("Reconnect");
    expect(db.upsert).not.toHaveBeenCalled();
  });
});
