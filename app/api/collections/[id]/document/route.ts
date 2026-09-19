import { NextResponse } from "next/server";
import { requireUserOrNull } from "@/lib/auth/session";
import { withApiErrorHandling, type RouteContext } from "@/lib/api/handler";
import { getBookAccess, getPublicCollectionBySlug } from "@/lib/share-collections-repo";
import { prisma } from "@/lib/db";
import { resolveBookDocument } from "@/lib/books/resolve";

// Reading a book is independent of whether its owner permits downloads.
export const GET = withApiErrorHandling(async (_request: Request, context: RouteContext<{ id: string }>) => {
  const [user, { id }] = await Promise.all([requireUserOrNull(), context.params]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await getBookAccess(user.id, id))) return NextResponse.json({ error: "Book not found." }, { status: 404 });
  const entry = await prisma.shareCollection.findUnique({ where: { id }, select: { slug: true, ownerId: true } });
  const collection = entry && await getPublicCollectionBySlug(entry.slug, true, user.id);
  if (!collection || !entry) return NextResponse.json({ error: "Book not found." }, { status: 404 });
  return NextResponse.json({ book: await resolveBookDocument(collection, entry.ownerId) });
});
