import { NextResponse } from "next/server";
import { requireUserOrNull } from "@/lib/auth/session";
import { getAccessToken, withConnectionToken } from "@/lib/integrations/repository";
import { notionFetch, NotionImportError } from "@/lib/imports/notion-import";
import { withApiErrorHandling } from "@/lib/api/handler";

function pageTitle(page: any): string {
  const property = Object.values(page.properties ?? {}).find((value: any) => value?.type === "title") as any;
  return property?.title?.map((item: any) => item.plain_text || "").join("") || "Untitled Notion page";
}

export const GET = withApiErrorHandling(async (request: Request) => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const token = await getAccessToken(user.id, "notion");
  if (!token) return NextResponse.json({ error: "Connect Notion in Settings first." }, { status: 409 });
  const cursor = new URL(request.url).searchParams.get("cursor");
  if (cursor && cursor.length > 2000) return NextResponse.json({ error: "Invalid page cursor." }, { status: 400 });
  try {
    const data = await withConnectionToken(user.id, "notion", token => notionFetch("/search", token, { method: "POST", body: JSON.stringify({ filter: { property: "object", value: "page" }, sort: { direction: "descending", timestamp: "last_edited_time" }, page_size: 50, ...(cursor ? { start_cursor: cursor } : {}) }) }));
    const resources = (data.results ?? []).map((page: any) => ({ id: page.id, name: pageTitle(page), url: page.url, modifiedTime: page.last_edited_time }));
    return NextResponse.json({ resources, nextCursor: data.has_more ? data.next_cursor : null }, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    if (error instanceof NotionImportError) return NextResponse.json({ error: error.message }, { status: 502 });
    throw error;
  }
});
