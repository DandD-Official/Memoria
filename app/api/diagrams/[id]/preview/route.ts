import { NextResponse } from "next/server";
import { requireUserOrNull } from "@/lib/auth/session";
import { canView } from "@/lib/permissions";
import { findDiagramPreview } from "@/lib/diagrams/repo";
import { withApiErrorHandling, type RouteContext } from "@/lib/api/handler";

/**
 * Serves the rendered snapshot image stored by
 * lib/diagrams/repo.ts#updateDiagramPreview — used by the in-app embed
 * (components/mmd/blocks/diagram-block.tsx) for a fast preview without
 * loading the full canvas library, and eventually by the PDF/DOCX
 * exporters once they're updated to embed real diagram images instead of
 * the current text placeholder (see .context/milestones.md, Milestone 9's
 * "Not done" note).
 */
export const GET = withApiErrorHandling(async (_request: Request, context: RouteContext<{ id: string }>) => {
  const params = await context.params;
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await canView(user.id, "DIAGRAM", params.id);
  if (!allowed) return NextResponse.json({ error: "Diagram not found." }, { status: 404 });

  const preview = await findDiagramPreview(params.id);
  if (!preview) return NextResponse.json({ error: "No preview available for this diagram yet." }, { status: 404 });

  return new NextResponse(preview.image, {
    headers: { "Content-Type": preview.mimeType, "Cache-Control": "private, max-age=60" },
  });
});
