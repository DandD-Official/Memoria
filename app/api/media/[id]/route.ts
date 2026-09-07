import { NextResponse } from "next/server";
import { requireUserOrNull } from "@/lib/auth/session";
import { findMedia } from "@/lib/media/repo";
import { withApiErrorHandling, type RouteContext } from "@/lib/api/handler";

export const GET = withApiErrorHandling(async (_request: Request, context: RouteContext<{ id: string }>) => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const media = await findMedia(id, user.id);
  if (!media) return NextResponse.json({ error: "Media not found." }, { status: 404 });
  return new NextResponse(new Uint8Array(media.data), { headers: { "Content-Type": media.mimeType, "Cache-Control": "private, max-age=31536000, immutable" } });
});
