import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiErrorHandling, type RouteContext } from "@/lib/api/handler";
import { requireUserOrNull } from "@/lib/auth/session";
import { getPublicCollectionBySlug } from "@/lib/share-collections-repo";
import { bookmarksSchema, readBookmarks } from "@/lib/books/notebooks";
import { cookies } from "next/headers";
import { collectionAccessCookieName, validCollectionAccessToken } from "@/lib/collections/access";
import { prisma } from "@/lib/db";

const schema = z.object({ lastItemId: z.string().min(1).nullable().optional(), bookmarks: bookmarksSchema.optional() });

async function canRead(userId: string, id: string) {
  const entry = await prisma.shareCollection.findUnique({ where: { id }, select: { slug: true } });
  if (!entry) return false;
  const jar = await cookies();
  const unlocked = validCollectionAccessToken(entry.slug, jar.get(collectionAccessCookieName(entry.slug))?.value);
  return Boolean(await getPublicCollectionBySlug(entry.slug, unlocked, userId));
}

export const GET = withApiErrorHandling(async (_request: Request, context: RouteContext<{ id: string }>) => {
  const [{ id }, user] = await Promise.all([context.params, requireUserOrNull()]);
  if (!user) return NextResponse.json({ error: "Sign in to sync bookmarks." }, { status: 401 });
  if (!(await canRead(user.id, id))) return NextResponse.json({ error: "Book not found." }, { status: 404 });
  const progress = await prisma.shareCollectionProgress.findUnique({ where: { collectionId_userId: { collectionId: id, userId: user.id } } });
  return NextResponse.json({ lastItemId: progress?.lastItemId ?? null, bookmarks: readBookmarks(progress?.bookmarks) });
});

export const PATCH = withApiErrorHandling(async (request: Request, context: RouteContext<{ id: string }>) => {
  const [{ id }, user, body] = await Promise.all([context.params, requireUserOrNull(), request.json().catch(() => null)]);
  if (!user) return NextResponse.json({ error: "Sign in to save reading progress." }, { status: 401 });
  if (!(await canRead(user.id, id))) return NextResponse.json({ error: "Book not found." }, { status: 404 });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid chapter." }, { status: 400 });
  if (parsed.data.lastItemId) {
    const item = await prisma.shareCollectionItem.findFirst({ where: { id: parsed.data.lastItemId, collectionId: id }, select: { id: true } });
    if (!item) return NextResponse.json({ error: "That chapter is not in this Book." }, { status: 400 });
  }
  if (parsed.data.bookmarks) {
    const chapterIds = parsed.data.bookmarks.flatMap(bookmark => bookmark.chapterId ? [bookmark.chapterId] : []);
    const included = await prisma.shareCollectionItem.findMany({ where: { collectionId: id, id: { in: chapterIds } }, select: { id: true } });
    if (chapterIds.some(chapterId => !included.some(item => item.id === chapterId))) return NextResponse.json({ error: "Bookmark chapter not found." }, { status: 400 });
  }
  const progress = await prisma.shareCollectionProgress.upsert({
    where: { collectionId_userId: { collectionId: id, userId: user.id } },
    update: { ...parsed.data, lastAccessedAt: new Date() },
    create: { collectionId: id, userId: user.id, ...parsed.data },
  });
  return NextResponse.json({ progress });
});
