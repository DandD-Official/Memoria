import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ user: vi.fn(), cookie: vi.fn(), save: vi.fn(), token: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ requireUserOrNull: mocks.user }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: mocks.cookie }) }));
vi.mock("@/lib/integrations/repository", () => ({ saveConnection: mocks.save, getAccessToken: mocks.token }));
vi.mock("@/lib/api/handler", () => ({ withApiErrorHandling: (handler: unknown) => handler }));
import { GET as connect } from "@/app/api/integrations/[provider]/connect/route";
import { GET as callback } from "@/app/api/integrations/[provider]/callback/route";
import { POST as picker } from "@/app/api/integrations/google/picker/route";
import { createOAuthState } from "@/lib/integrations/oauth-state";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.user.mockResolvedValue({ id: "alice" });
  vi.stubEnv("AUTH_SECRET", "integration-route-test-secret");
  vi.stubEnv("NEXTAUTH_URL", "https://memoria.example.com");
  vi.stubEnv("GOOGLE_CLIENT_ID", "123456789-abcd.apps.googleusercontent.com");
  vi.stubEnv("GOOGLE_CLIENT_SECRET", "google-test-secret");
  vi.stubEnv("GOOGLE_PICKER_API_KEY", "AIza-test-key");
  vi.stubEnv("GOOGLE_CLOUD_PROJECT_NUMBER", "123456789");
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
const context = (provider = "google") => ({ params: Promise.resolve({ provider }) });

describe("OAuth routes", () => {
  it("starts per-file OAuth with a secure, browser-bound state cookie", async () => {
    const response = await connect(new Request("https://memoria.example.com/api/integrations/google/connect"), context());
    const url = new URL(response.headers.get("location")!);
    expect(url.searchParams.get("scope")).toBe("openid email https://www.googleapis.com/auth/drive.file");
    expect(url.searchParams.get("redirect_uri")).toBe("https://memoria.example.com/api/integrations/google/callback");
    expect(response.cookies.get("memoria-oauth-google")?.value).toBe(url.searchParams.get("state"));
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain("Secure");
  });
  it.each(["missing-cookie", "wrong-user", "expired"])("rejects %s before exchanging credentials", async mode => {
    if (mode === "expired") vi.spyOn(Date, "now").mockReturnValueOnce(0);
    const state = createOAuthState(mode === "wrong-user" ? "bob" : "alice", "google");
    vi.restoreAllMocks();
    if (mode !== "missing-cookie") mocks.cookie.mockReturnValue({ value: state });
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    const response = await callback(new Request(`https://memoria.example.com/api/integrations/google/callback?code=code&state=${state}`), context());
    expect(response.headers.get("location")).toContain("invalid_state");
    expect(fetcher).not.toHaveBeenCalled();
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("handles cancelled consent and clears the state cookie", async () => {
    const state = createOAuthState("alice", "google"); mocks.cookie.mockReturnValue({ value: state });
    const response = await callback(new Request(`https://memoria.example.com/api/integrations/google/callback?error=access_denied&state=${state}`), context());
    expect(response.headers.get("location")).toContain("google_denied");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("does not save partially granted Google authorization", async () => {
    const state = createOAuthState("alice", "google"); mocks.cookie.mockReturnValue({ value: state });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ access_token: "access", scope: "openid email" })));
    const response = await callback(new Request(`https://memoria.example.com/api/integrations/google/callback?code=code&state=${state}`), context());
    expect(response.headers.get("location")).toContain("google_scope");
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("stores Notion's token pair only against the session user", async () => {
    const state = createOAuthState("alice", "notion"); mocks.cookie.mockReturnValue({ value: state });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ access_token: "access", refresh_token: "refresh", workspace_id: "workspace-a", workspace_name: "Alice" })));
    const response = await callback(new Request(`https://memoria.example.com/api/integrations/notion/callback?code=code&state=${state}&userId=bob`), context("notion"));
    expect(response.headers.get("location")).toContain("connected=notion");
    expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ userId: "alice", provider: "notion", accessToken: "access", refreshToken: "refresh" }));
  });
  it("does not expose Picker tokens to unauthenticated or cross-origin requests", async () => {
    const denied = await picker(new Request("https://memoria.example.com/api/integrations/google/picker", { method: "POST", headers: { origin: "https://other.example" } }));
    expect(denied.status).toBe(403);
    mocks.user.mockResolvedValue(null);
    const anonymous = await picker(new Request("https://memoria.example.com/api/integrations/google/picker", { method: "POST", headers: { origin: "https://memoria.example.com" } }));
    expect(anonymous.status).toBe(401);
    expect(mocks.token).not.toHaveBeenCalled();
  });
  it("exposes only the current user's Picker token with no-store headers", async () => {
    mocks.token.mockResolvedValue("alice-access");
    const response = await picker(new Request("https://memoria.example.com/api/integrations/google/picker", { method: "POST", headers: { origin: "https://memoria.example.com" } }));
    expect(mocks.token).toHaveBeenCalledWith("alice", "google");
    expect(response.headers.get("cache-control")).toContain("no-store");
    const data = await response.json();
    expect(data.accessToken).toBe("alice-access");
    expect(data).not.toHaveProperty("refreshToken");
    expect(data).not.toHaveProperty("clientSecret");
  });
});
