import { NextResponse } from "next/server";
import { withApiErrorHandling, type RouteContext } from "@/lib/api/handler";
import { guestRateLimit } from "@/lib/guest-rate-limit";
import { addFeedback } from "@/lib/share-collections-repo";
import { z } from "zod";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { collectionAccessCookieName, validCollectionAccessToken } from "@/lib/collections/access";
import { requireUserOrNull } from "@/lib/auth/session";

const feedbackSchema = z.object({
  authorName: z.string().max(80).optional(),
  message: z.string().min(1, "Say something first.").max(2000),
  resourceType: z.enum(["NOTE", "REVIEWER", "QUIZ"]).optional(),
  resourceId: z.string().optional(),
  parentId: z.string().optional(),
}).refine((value) => Boolean(value.resourceType) === Boolean(value.resourceId), {
  message: "A feedback resource type and id must be provided together.",
});

export const POST = withApiErrorHandling(async (request: Request, context: RouteContext<{ slug: string }>) => {
  const params = await context.params;
  const user = await requireUserOrNull();
  if (!user) {
    const limited = await guestRateLimit(request);
    if (limited) return limited;
  }

  const gate = await prisma.shareCollection.findUnique({ where: { slug: params.slug }, select: { id: true, ownerId: true, passwordHash: true, members: user ? { where: { userId: user.id }, select: { id: true } } : false } });
  const privateAccess = Boolean(user && gate && (gate.ownerId === user.id || ("members" in gate && Array.isArray(gate.members) && gate.members.length)));
  if (gate?.passwordHash && !privateAccess) {
    const cookieStore = await cookies();
    if (!validCollectionAccessToken(params.slug, cookieStore.get(collectionAccessCookieName(params.slug))?.value)) {
      return NextResponse.json({ error: "Unlock this Book before leaving feedback." }, { status: 401 });
    }
  }

  const body = await request.json().catch(() => null);
  const parsed = feedbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid feedback." }, { status: 400 });
  }

  try {
    const feedback = await addFeedback({ slug: params.slug, ...parsed.data, authorName: user?.name ?? parsed.data.authorName, authorUserId: user?.id });
    return NextResponse.json({ feedback }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Couldn't submit feedback." }, { status: 404 });
  }
});
