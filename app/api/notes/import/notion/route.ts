import { NextResponse } from "next/server";
import { requireUserOrNull } from "@/lib/auth/session";
import { extractNotionPageId, importNotionPage, NotionImportError } from "@/lib/imports/notion-import";
import { getAccessToken, withConnectionToken } from "@/lib/integrations/repository";
import { syncConnectedNote } from "@/lib/notes-repo";
import { withApiErrorHandling } from "@/lib/api/handler";
import { revalidatePath } from "next/cache";

// POST { url: string } — imports exactly the one Notion page the URL points
// to. See lib/imports/notion-import.ts for why this can never reach more
// than that single page.
export const POST = withApiErrorHandling(async (request: Request) => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accessToken = await getAccessToken(user.id, "notion");
  if (!accessToken) return NextResponse.json({ error: "Connect your Notion account in Settings first." }, { status: 409 });

  const body = await request.json().catch(() => null);
  const url = typeof body?.url === "string" ? body.url.trim() : "";
  if (!url) {
    return NextResponse.json({ error: "Paste a Notion page link first." }, { status: 400 });
  }

  try {
    const { title, content, hasImages } = await withConnectionToken(user.id, "notion", token => importNotionPage(url, token));
    const { note, refreshed } = await syncConnectedNote({
      ownerId: user.id,
      title,
      originalFilename: url,
      sourceType: "NOTION",
      sourceExternalId: extractNotionPageId(url),
      sourceUrl: url,
      content,
    });
    revalidatePath("/notes");
    revalidatePath(`/notes/${note.id}`);
    revalidatePath("/dashboard");
    revalidatePath("/search");
    return NextResponse.json(
      {
        note,
        status: refreshed ? "refreshed" : "complete",
        notice: hasImages
          ? "This page contained images. Memoria only imports text, so any images were skipped — only the written content came through."
          : undefined,
      },
      { status: refreshed ? 200 : 201 }
    );
  } catch (err) {
    if (err instanceof NotionImportError) {
      return NextResponse.json({ error: err.message, status: "failed" }, { status: 422 });
    }
    throw err;
  }
});
