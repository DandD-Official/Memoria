import { NextResponse } from "next/server";
import { requireUserOrNull } from "@/lib/auth/session";
import { getAccessToken } from "@/lib/integrations/repository";
import { withApiErrorHandling } from "@/lib/api/handler";

// Only the signed-in user's short-lived token reaches Google's browser picker.
// Client secrets and refresh tokens always remain on the server.
export const POST = withApiErrorHandling(async (request: Request) => {
  const origin = request.headers.get("origin");
  const expected = new URL(process.env.NEXTAUTH_URL || request.url).origin;
  if (origin !== expected) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const apiKey = process.env.GOOGLE_PICKER_API_KEY;
  const appId = process.env.GOOGLE_CLOUD_PROJECT_NUMBER;
  if (!apiKey || !appId) return NextResponse.json({ error: "The site owner needs to configure Google Picker." }, { status: 503 });
  const accessToken = await getAccessToken(user.id, "google");
  if (!accessToken) return NextResponse.json({ error: "Connect Google Drive in Settings first." }, { status: 409 });
  return NextResponse.json({ accessToken, apiKey, appId }, { headers: { "Cache-Control": "no-store, private" } });
});
