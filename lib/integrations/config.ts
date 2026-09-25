import type { OAuthProvider } from "@/lib/integrations/oauth-state";

export function appOrigin(request: Request): string {
  return process.env.NEXTAUTH_URL?.replace(/\/$/, "") || new URL(request.url).origin;
}

export function callbackUrl(request: Request, provider: OAuthProvider): string {
  return `${appOrigin(request)}/api/integrations/${provider}/callback`;
}

function isUsableSecret(value: string | undefined): boolean {
  const candidate = value?.trim() ?? "";
  return candidate.length >= 8
    && !/^https?:\/\//i.test(candidate)
    && !/(your[_ -]|example|placeholder|callback)/i.test(candidate);
}

function isGoogleClientId(value: string | undefined): boolean {
  return /^\d+-[a-z0-9_-]+\.apps\.googleusercontent\.com$/i.test(value?.trim() ?? "");
}

function isNotionClientId(value: string | undefined): boolean {
  const candidate = value?.trim() ?? "";
  return candidate.length >= 10
    && !/^https?:\/\//i.test(candidate)
    && !/(your[_ -]|example|placeholder|callback)/i.test(candidate);
}

export function isProviderConfigured(provider: OAuthProvider): boolean {
  return provider === "google"
    ? isGoogleClientId(process.env.GOOGLE_CLIENT_ID) && isUsableSecret(process.env.GOOGLE_CLIENT_SECRET)
      && isUsableSecret(process.env.GOOGLE_PICKER_API_KEY) && /^\d+$/.test(process.env.GOOGLE_CLOUD_PROJECT_NUMBER?.trim() ?? "")
    : isNotionClientId(process.env.NOTION_CLIENT_ID) && isUsableSecret(process.env.NOTION_CLIENT_SECRET);
}
