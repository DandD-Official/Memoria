import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiErrorHandling, type RouteContext } from "@/lib/api/handler";
import { requireUserOrNull } from "@/lib/auth/session";
import { getBookAccess } from "@/lib/share-collections-repo";
import { prisma } from "@/lib/db";

const schema = z.object({ lastItemId: z.string().min(1).nullable() });

export const PATCH = withApiErrorHandling(async (request: Request, context: RouteContext<{ id: string }>) => {
  const [{ id }, user, body] = await Promise.all([context.params, requireUserOrNull(), request.json().catch(() => null)]);
  if (!user) return NextResponse.json({ error: "Sign in to save reading progress." }, { status: 401 });
  if (!(await getBookAccess(user.id, id))) return NextResponse.json({ error: "Book not found." }, { status: 404 });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid chapter." }, { status: 400 });
  if (parsed.data.lastItemId) {
    const item = await prisma.shareCollectionItem.findFirst({ where: { id: parsed.data.lastItemId, collectionId: id }, select: { id: true } });
    if (!item) return NextResponse.json({ error: "That chapter is not in this Book." }, { status: 400 });
  }
  const progress = await prisma.shareCollectionProgress.upsert({
    where: { collectionId_userId: { collectionId: id, userId: user.id } },
    update: { lastItemId: parsed.data.lastItemId, lastAccessedAt: new Date() },
    create: { collectionId: id, userId: user.id, lastItemId: parsed.data.lastItemId },
  });
  return NextResponse.json({ progress });
});
