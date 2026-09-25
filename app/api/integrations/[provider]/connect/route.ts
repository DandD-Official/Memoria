import { NextResponse } from "next/server";
import { requireUserOrNull } from "@/lib/auth/session";
import { callbackUrl, isProviderConfigured } from "@/lib/integrations/config";
import { createOAuthState, oauthCookieName, type OAuthProvider } from "@/lib/integrations/oauth-state";
import { withApiErrorHandling } from "@/lib/api/handler";

export const GET = withApiErrorHandling(async (request: Request, context: { params: Promise<{ provider: string }> }) => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));
  const { provider: rawProvider } = await context.params;
  if (rawProvider !== "google" && rawProvider !== "notion") return NextResponse.json({ error: "Unknown provider." }, { status: 404 });
  const provider = rawProvider as OAuthProvider;
  if (!isProviderConfigured(provider)) return NextResponse.redirect(new URL(`/settings?integration_error=${provider}_not_configured`, request.url));
  const redirectUri = callbackUrl(request, provider);
  const state = createOAuthState(user.id, provider);
  function redirect(url: URL) {
    const response = NextResponse.redirect(url);
    response.cookies.set(oauthCookieName(provider), state, { httpOnly: true, secure: new URL(redirectUri).protocol === "https:", sameSite: "lax", path: `/api/integrations/${provider}/callback`, maxAge: 600 });
    response.headers.set("Cache-Control", "no-store");
    return response;
  }

  if (provider === "google") {
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.search = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email https://www.googleapis.com/auth/drive.file",
      access_type: "offline",
      prompt: "consent select_account",
      state,
    }).toString();
    return redirect(url);
  }

  const url = new URL("https://api.notion.com/v1/oauth/authorize");
  url.search = new URLSearchParams({
    client_id: process.env.NOTION_CLIENT_ID || "",
    redirect_uri: redirectUri,
    response_type: "code",
    owner: "user",
    state,
  }).toString();
  return redirect(url);
});
