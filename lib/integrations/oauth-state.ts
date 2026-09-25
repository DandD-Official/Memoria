import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export type OAuthProvider = "google" | "notion";
export const oauthCookieName = (provider: OAuthProvider) => `memoria-oauth-${provider}`;
interface StatePayload { userId: string; provider: OAuthProvider; expiresAt: number; nonce: string }

function signingSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("Missing AUTH_SECRET.");
  return secret;
}

export function createOAuthState(userId: string, provider: OAuthProvider): string {
  const payload: StatePayload = { userId, provider, expiresAt: Date.now() + 10 * 60_000, nonce: randomBytes(16).toString("hex") };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", signingSecret()).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifyOAuthState(state: string, userId: string, provider: OAuthProvider): boolean {
  const [encoded, supplied, extra] = state.split(".");
  if (extra !== undefined) return false;
  if (!encoded || !supplied) return false;
  const expected = createHmac("sha256", signingSecret()).update(encoded).digest();
  const suppliedBuffer = Buffer.from(supplied, "base64url");
  if (expected.length !== suppliedBuffer.length || !timingSafeEqual(expected, suppliedBuffer)) return false;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as StatePayload;
    return payload.userId === userId && payload.provider === provider && payload.expiresAt > Date.now();
  } catch {
    return false;
  }
}
