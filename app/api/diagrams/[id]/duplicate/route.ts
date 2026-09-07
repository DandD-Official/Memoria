import { NextResponse } from "next/server";
import { requireUserOrNull } from "@/lib/auth/session";
import { isOwner } from "@/lib/permissions";
import { duplicateDiagram } from "@/lib/diagrams/repo";
import { withApiErrorHandling, type RouteContext } from "@/lib/api/handler";

/**
 * Duplicates a diagram into a new, independently-editable row — see the
 * project brief's explicit diagram-duplication requirement and
 * lib/diagrams/repo.ts's duplicateDiagram() doc comment. Restricted to
 * the owner for v1 (matches duplicateDiagram()'s own ownership check) —
 * the brief describes this as an editor-toolbar action on your own
 * diagram, not a "save a copy of someone else's shared diagram" sharing
 * feature; the latter would need its own product decision this pass
 * doesn't make.
 */
export const POST = withApiErrorHandling(async (_request: Request, context: RouteContext<{ id: string }>) => {
  const params = await context.params;
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const owns = await isOwner(user.id, "DIAGRAM", params.id);
  if (!owns) return NextResponse.json({ error: "Diagram not found." }, { status: 404 });

  const duplicate = await duplicateDiagram(params.id, user.id);
  if (!duplicate) return NextResponse.json({ error: "Diagram not found." }, { status: 404 });

  return NextResponse.json({ diagram: duplicate }, { status: 201 });
});
