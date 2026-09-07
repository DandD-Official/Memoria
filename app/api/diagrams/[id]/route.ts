import { NextResponse } from "next/server";
import { requireUserOrNull } from "@/lib/auth/session";
import { updateDiagramSchema } from "@/lib/validation/diagram";
import { canView, canEdit, isOwner, deleteSharesForResource } from "@/lib/permissions";
import { findDiagramById, updateDiagram, deleteDiagram } from "@/lib/diagrams/repo";
import { withApiErrorHandling, type RouteContext } from "@/lib/api/handler";

export const GET = withApiErrorHandling(async (_request: Request, context: RouteContext<{ id: string }>) => {
  const params = await context.params;
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await canView(user.id, "DIAGRAM", params.id);
  if (!allowed) return NextResponse.json({ error: "Diagram not found." }, { status: 404 });

  const diagram = await findDiagramById(params.id);
  if (!diagram) return NextResponse.json({ error: "Diagram not found." }, { status: 404 });

  return NextResponse.json({ diagram });
});

export const PATCH = withApiErrorHandling(async (request: Request, context: RouteContext<{ id: string }>) => {
  const params = await context.params;
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await canEdit(user.id, "DIAGRAM", params.id);
  if (!allowed) return NextResponse.json({ error: "Diagram not found." }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = updateDiagramSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid update." }, { status: 400 });
  }

  const diagram = await updateDiagram(params.id, parsed.data);
  return NextResponse.json({ diagram });
});

export const DELETE = withApiErrorHandling(async (_request: Request, context: RouteContext<{ id: string }>) => {
  const params = await context.params;
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const owns = await isOwner(user.id, "DIAGRAM", params.id);
  if (!owns) return NextResponse.json({ error: "Diagram not found." }, { status: 404 });

  await deleteSharesForResource("DIAGRAM", params.id);
  await deleteDiagram(params.id);

  return NextResponse.json({ success: true });
});
