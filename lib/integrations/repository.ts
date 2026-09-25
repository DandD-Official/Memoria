import { IntegrationProvider, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { decryptToken, encryptToken } from "@/lib/integrations/crypto";
import type { OAuthProvider } from "@/lib/integrations/oauth-state";

const PROVIDERS: Record<OAuthProvider, IntegrationProvider> = {
  google: IntegrationProvider.GOOGLE,
  notion: IntegrationProvider.NOTION,
};

export async function saveConnection(input: {
  userId: string;
  provider: OAuthProvider;
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  metadata?: Prisma.InputJsonValue;
}) {
  return prisma.integrationConnection.upsert({
    where: { userId_provider: { userId: input.userId, provider: PROVIDERS[input.provider] } },
    create: {
      userId: input.userId,
      provider: PROVIDERS[input.provider],
      accessToken: encryptToken(input.accessToken),
      refreshToken: input.refreshToken ? encryptToken(input.refreshToken) : undefined,
      expiresAt: input.expiresIn ? new Date(Date.now() + input.expiresIn * 1000) : undefined,
      metadata: input.metadata,
    },
    update: {
      accessToken: encryptToken(input.accessToken),
      refreshToken: input.refreshToken ? encryptToken(input.refreshToken) : null,
      expiresAt: input.expiresIn ? new Date(Date.now() + input.expiresIn * 1000) : null,
      metadata: input.metadata,
    },
  });
}

export async function connectionStatuses(userId: string): Promise<
  Array<{ provider: "google" | "notion"; metadata: { email?: string; workspaceName?: string } | null }>
> {
  const connections = await prisma.integrationConnection.findMany({ where: { userId }, select: { provider: true, metadata: true } });
  return connections.map((connection) => {
    const raw = connection.metadata && typeof connection.metadata === "object" && !Array.isArray(connection.metadata)
      ? connection.metadata as Record<string, unknown>
      : null;
    return {
      provider: connection.provider === IntegrationProvider.GOOGLE ? "google" : "notion",
      metadata: raw ? {
        email: typeof raw.email === "string" ? raw.email : undefined,
        workspaceName: typeof raw.workspaceName === "string" ? raw.workspaceName : undefined,
      } : null,
    };
  });
}

export async function disconnectProvider(userId: string, provider: OAuthProvider) {
  await prisma.integrationConnection.deleteMany({ where: { userId, provider: PROVIDERS[provider] } });
}

export class ConnectionExpiredError extends Error {
  constructor(provider: OAuthProvider) {
    super("Your " + (provider === "google" ? "Google Drive" : "Notion") + " connection needs to be renewed. Reconnect it in Settings.");
  }
}

/** Serializes rotating refresh tokens across server instances. */
export async function getAccessToken(userId: string, provider: OAuthProvider, rejectedToken?: string): Promise<string | null> {
  const where = { userId_provider: { userId, provider: PROVIDERS[provider] } };
  const current = await prisma.integrationConnection.findUnique({ where });
  if (!current) return null;
  const token = decryptToken(current.accessToken);
  const expired = current.expiresAt && current.expiresAt.getTime() < Date.now() + 60_000;
  if (!expired && (!rejectedToken || rejectedToken !== token)) return token;
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}), hashtext(${provider}))`;
    const connection = await tx.integrationConnection.findUnique({ where });
    if (!connection) return null;
    const latest = decryptToken(connection.accessToken);
    if (latest !== token) return latest;
    if (!connection.refreshToken) throw new ConnectionExpiredError(provider);
    const refreshToken = decryptToken(connection.refreshToken);
    const response = await fetch(provider === "google" ? "https://oauth2.googleapis.com/token" : "https://api.notion.com/v1/oauth/token", {
      method: "POST",
      headers: provider === "google" ? { "Content-Type": "application/x-www-form-urlencoded" } : {
        "Content-Type": "application/json",
        Authorization: "Basic " + Buffer.from(process.env.NOTION_CLIENT_ID + ":" + process.env.NOTION_CLIENT_SECRET).toString("base64"),
      },
      body: provider === "google" ? new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
        refresh_token: refreshToken, grant_type: "refresh_token",
      }) : JSON.stringify({ refresh_token: refreshToken, grant_type: "refresh_token" }),
      cache: "no-store", signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new ConnectionExpiredError(provider);
    const tokens = await response.json() as { access_token?: string; refresh_token?: string; expires_in?: number };
    if (!tokens.access_token) throw new ConnectionExpiredError(provider);
    // A disconnect/relink while refreshing must win over this request.
    const updated = await tx.integrationConnection.updateMany({
      where: { id: connection.id, accessToken: connection.accessToken },
      data: {
        accessToken: encryptToken(tokens.access_token),
        refreshToken: tokens.refresh_token ? encryptToken(tokens.refresh_token) : connection.refreshToken,
        expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
      },
    });
    if (!updated.count) throw new ConnectionExpiredError(provider);
    return tokens.access_token;
  }, { timeout: 25_000 });
}

export async function withConnectionToken<T>(userId: string, provider: OAuthProvider, operation: (token: string) => Promise<T>): Promise<T> {
  const token = await getAccessToken(userId, provider);
  if (!token) throw new ConnectionExpiredError(provider);
  try { return await operation(token); } catch (error) {
    if (!(error instanceof Error) || !("status" in error) || error.status !== 401) throw error;
    const renewed = await getAccessToken(userId, provider, token);
    if (!renewed) throw new ConnectionExpiredError(provider);
    return operation(renewed);
  }
}
