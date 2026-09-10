import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { withApiErrorHandling, type RouteContext } from "@/lib/api/handler";
import { requireUserOrNull } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { collectionAccessCookieName, validCollectionAccessToken } from "@/lib/collections/access";
import { getPublicCollectionBySlug } from "@/lib/share-collections-repo";
import { collectionMarkdown, safeBookExportName } from "@/lib/book-export";

export const GET = withApiErrorHandling(async (request: Request, context: RouteContext<{ slug: string }>) => {
  const [{ slug }, user] = await Promise.all([context.params, requireUserOrNull()]);
  const gate = await prisma.shareCollection.findUnique({
    where: { slug },
    select: {
      id: true,
      ownerId: true,
      isPublished: true,
      allowExport: true,
      passwordHash: true,
      expiresAt: true,
      members: user ? { where: { userId: user.id }, select: { allowExport: true } } : false,
    },
  });
  const member = gate && "members" in gate && Array.isArray(gate.members) ? gate.members[0] : undefined;
  const privateAccess = Boolean(user && gate && (gate.ownerId === user.id || member));
  if (!gate || (!gate.isPublished && !privateAccess) || (gate.expiresAt && gate.expiresAt <= new Date())) return NextResponse.json({ error: "Book not found." }, { status: 404 });

  const cookieStore = await cookies();
  const passwordAccess = !gate.passwordHash || validCollectionAccessToken(slug, cookieStore.get(collectionAccessCookieName(slug))?.value);
  if (!privateAccess && !passwordAccess) return NextResponse.json({ error: "This Book requires its password." }, { status: 404 });

  const allowed = gate.ownerId === user?.id || (member ? member.allowExport : gate.isPublished && gate.allowExport && passwordAccess);
  if (!allowed) return NextResponse.json({ error: "Exporting this Book is disabled by its owner." }, { status: 403 });

  const collection = await getPublicCollectionBySlug(slug, Boolean(gate.passwordHash && passwordAccess), user?.id);
  if (!collection || !collection.canExport) return NextResponse.json({ error: "Book not found." }, { status: 404 });
  const markdown = collectionMarkdown(collection);
  if (new URL(request.url).searchParams.get("format") === "json") {
    const body = JSON.stringify({ format: "memoria-collection-export", version: "1", title: collection.title, description: collection.description, notes: collection.notes, reviewers: collection.reviewers, quizzes: collection.quizzes });
    return new NextResponse(body, { headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="memoria-book-${safeBookExportName(collection.title)}.json"` } });
  }
  return NextResponse.json({ title: collection.title, subtitle: collection.subtitle, description: collection.description, tocTitle: collection.tocTitle, ownerName: collection.ownerName, markdown });
});
