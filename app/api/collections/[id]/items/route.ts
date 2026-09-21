import { NextResponse } from "next/server";
import { requireUserOrNull } from "@/lib/auth/session";
import { withApiErrorHandling, type RouteContext } from "@/lib/api/handler";
import { addCollectionItem, removeCollectionItem, reorderCollectionItems, assignNotebookSubject } from "@/lib/share-collections-repo";
import { z } from "zod";

const addSchema = z.object({
  resourceType: z.enum(["NOTE", "REVIEWER", "QUIZ"]),
  resourceId: z.string().min(1),
  subjectId: z.string().min(1).max(80).nullable().optional(),
});
const reorderSchema = z.union([z.object({ itemIds: z.array(z.string()).max(100) }), z.object({ itemId: z.string().min(1), subjectId: z.string().min(1).max(80).nullable() })]);

export const PATCH = withApiErrorHandling(async (request: Request, context: RouteContext<{ id: string }>) => {
  const [{ id }, user, body] = await Promise.all([context.params, requireUserOrNull(), request.json().catch(() => null)]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid order." }, { status: 400 });
  try {
    if ("itemIds" in parsed.data) await reorderCollectionItems(user.id, id, parsed.data.itemIds);
    else await assignNotebookSubject(user.id, id, parsed.data.itemId, parsed.data.subjectId);
    return NextResponse.json({ success: true });
  }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Couldn't reorder items." }, { status: 400 }); }
});

export const POST = withApiErrorHandling(async (request: Request, context: RouteContext<{ id: string }>) => {
  const params = await context.params;
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid item." }, { status: 400 });
  }

  try {
    const item = await addCollectionItem(user.id, params.id, parsed.data);
    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Couldn't add item." }, { status: 400 });
  }
});

export const DELETE = withApiErrorHandling(async (request: Request, context: RouteContext<{ id: string }>) => {
  const params = await context.params;
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get("itemId");
  if (!itemId) return NextResponse.json({ error: "Missing itemId." }, { status: 400 });

  try {
    await removeCollectionItem(user.id, params.id, itemId);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Couldn't remove item." }, { status: 400 });
  }
});
