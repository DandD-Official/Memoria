import { NextResponse } from "next/server";
import { withApiErrorHandling, type RouteContext } from "@/lib/api/handler";
import { requireUserOrNull } from "@/lib/auth/session";
import { canExportBook, getBookAccess, getPublicCollectionBySlug } from "@/lib/share-collections-repo";
import { prisma } from "@/lib/db";
import { collectionMarkdown, safeBookExportName } from "@/lib/book-export";

export const GET = withApiErrorHandling(async (request: Request, context: RouteContext<{ id: string }>) => {
  const [{ id }, user] = await Promise.all([context.params, requireUserOrNull()]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const book = await prisma.shareCollection.findUnique({ where: { id }, select: { slug: true } });
  if (!book || !(await getBookAccess(user.id, id))) return NextResponse.json({ error: "Book not found." }, { status: 404 });
  if (!(await canExportBook(user.id, id))) return NextResponse.json({ error: "Exporting this Book is disabled by its owner." }, { status: 403 });
  const collection = await getPublicCollectionBySlug(book.slug, true, user.id);
  if (!collection) return NextResponse.json({ error: "Book not found." }, { status: 404 });
  const markdown = collectionMarkdown(collection);
  if (new URL(request.url).searchParams.get("format") === "json") {
    const body = JSON.stringify({ format: "memoria-collection-export", version: "1", title: collection.title, description: collection.description, notes: collection.notes, reviewers: collection.reviewers, quizzes: collection.quizzes });
    return new NextResponse(body, { headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="memoria-book-${safeBookExportName(collection.title)}.json"` } });
  }
  return NextResponse.json({ title: collection.title, subtitle: collection.subtitle, description: collection.description, tocTitle: collection.tocTitle, ownerName: collection.ownerName, markdown });
});
