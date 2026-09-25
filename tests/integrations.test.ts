import { beforeEach, describe, expect, it } from "vitest";
import { decryptToken, encryptToken } from "@/lib/integrations/crypto";
import { createOAuthState, verifyOAuthState } from "@/lib/integrations/oauth-state";
import { isProviderConfigured } from "@/lib/integrations/config";

describe("integration credentials", () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = "unit-test-auth-secret-with-enough-entropy";
    process.env.INTEGRATION_ENCRYPTION_KEY = "unit-test-encryption-secret";
  });

  it("encrypts tokens with a random authenticated payload", () => {
    const first = encryptToken("sensitive-token");
    const second = encryptToken("sensitive-token");
    expect(first.equals(second)).toBe(false);
    expect(decryptToken(first)).toBe("sensitive-token");
  });

  it("binds OAuth state to both user and provider", () => {
    const state = createOAuthState("user-1", "google");
    expect(verifyOAuthState(state, "user-1", "google")).toBe(true);
    expect(verifyOAuthState(state, "user-2", "google")).toBe(false);
    expect(verifyOAuthState(state, "user-1", "notion")).toBe(false);
    expect(verifyOAuthState(`${state}changed`, "user-1", "google")).toBe(false);
  });

  it("accepts valid provider credentials", () => {
    process.env.GOOGLE_CLIENT_ID = "123456789-abc123xyz.apps.googleusercontent.com";
    process.env.GOOGLE_CLIENT_SECRET = "GOCSPX-valid-test-secret";
    process.env.GOOGLE_PICKER_API_KEY = "AIza-valid-test-key";
    process.env.GOOGLE_CLOUD_PROJECT_NUMBER = "123456789";
    process.env.NOTION_CLIENT_ID = "463558a3-725e-4f37-b6d3-0889894f68de";
    process.env.NOTION_CLIENT_SECRET = "notion-valid-test-secret";

    expect(isProviderConfigured("google")).toBe(true);
    expect(isProviderConfigured("notion")).toBe(true);
  });

  it("rejects callback URLs and placeholders used as OAuth credentials", () => {
    process.env.GOOGLE_CLIENT_ID = "https://memoria-studynotes.vercel.app/api/integrations/google/callback";
    process.env.GOOGLE_CLIENT_SECRET = "your_google_client_secret";
    process.env.NOTION_CLIENT_ID = "https://memoria-studynotes.vercel.app/api/integrations/notion/callback";
    process.env.NOTION_CLIENT_SECRET = "your_notion_client_secret";

    expect(isProviderConfigured("google")).toBe(false);
    expect(isProviderConfigured("notion")).toBe(false);
  });
});
