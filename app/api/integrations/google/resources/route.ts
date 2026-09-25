import { NextResponse } from "next/server";
import { requireUserOrNull } from "@/lib/auth/session";
import { getAccessToken } from "@/lib/integrations/repository";
import { withApiErrorHandling } from "@/lib/api/handler";

export const GET = withApiErrorHandling(async (request: Request) => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const token = await getAccessToken(user.id, "google");
  if (!token) return NextResponse.json({ error: "Connect Google in Settings first." }, { status: 409 });
  const params = new URLSearchParams({
    q: "trashed = false and mimeType = 'application/vnd.google-apps.document'",
    fields: "nextPageToken,files(id,name,modifiedTime,webViewLink)",
    orderBy: "modifiedTime desc",
    pageSize: "50",
  });
  const cursor = new URL(request.url).searchParams.get("cursor");
  if (cursor && cursor.length <= 2000) params.set("pageToken", cursor);
  const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!response.ok) return NextResponse.json({ error: "Google Drive could not be read. Reconnect Google in Settings." }, { status: 502 });
  const data = await response.json() as { files?: unknown[]; nextPageToken?: string };
  return NextResponse.json({ resources: data.files ?? [], nextCursor: data.nextPageToken ?? null }, { headers: { "Cache-Control": "no-store, private" } });
});
