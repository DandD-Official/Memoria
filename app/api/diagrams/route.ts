import { NextResponse } from "next/server";
import { requireUserOrNull } from "@/lib/auth/session";
import { createDiagramSchema } from "@/lib/validation/diagram";
import { createDiagram, findDiagramSummariesByOwner } from "@/lib/diagrams/repo";
import { withApiErrorHandling } from "@/lib/api/handler";

export const GET = withApiErrorHandling(async () => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const diagrams = await findDiagramSummariesByOwner(user.id);
  return NextResponse.json({ diagrams });
});

export const POST = withApiErrorHandling(async (request: Request) => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = createDiagramSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid diagram." }, { status: 400 });
  }

  const diagram = await createDiagram({ ownerId: user.id, title: parsed.data.title, data: parsed.data.data });
  return NextResponse.json({ diagram }, { status: 201 });
});
