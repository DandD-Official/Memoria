import { NextResponse } from "next/server";
import { withApiErrorHandling, type RouteContext } from "@/lib/api/handler";
import { getPublicCollectionBySlug } from "@/lib/share-collections-repo";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { collectionAccessCookieName, validCollectionAccessToken } from "@/lib/collections/access";

export const GET = withApiErrorHandling(async (_request: Request, context: RouteContext<{ slug: string }>) => {
  const params = await context.params;
  const gate = await prisma.shareCollection.findUnique({ where: { slug: params.slug }, select: { passwordHash: true } });
  const cookieStore = await cookies();
  const allowProtected = Boolean(gate?.passwordHash && validCollectionAccessToken(params.slug, cookieStore.get(collectionAccessCookieName(params.slug))?.value));
  const collection = await getPublicCollectionBySlug(params.slug, allowProtected);
  if (!collection) return NextResponse.json({ error: "This Book doesn't exist or is no longer shared." }, { status: 404 });
  return NextResponse.json({ collection });
});
