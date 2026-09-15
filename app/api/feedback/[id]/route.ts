import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiErrorHandling, type RouteContext } from "@/lib/api/handler";
import { requireUserOrNull } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { canDeleteFeedback } from "@/lib/feedback-permissions";

const updateSchema = z.object({ message: z.string().trim().min(1).max(2000) });

export const PATCH = withApiErrorHandling(async (request: Request, context: RouteContext<{ id: string }>) => {
  const [{ id }, user, body] = await Promise.all([context.params, requireUserOrNull(), request.json().catch(() => null)]);
  if (!user) return NextResponse.json({ error: "Sign in to edit comments." }, { status: 401 });
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Comment must be between 1 and 2,000 characters." }, { status: 400 });
  const result = await prisma.shareFeedback.updateMany({ where: { id, authorUserId: user.id }, data: { message: parsed.data.message } });
  if (!result.count) return NextResponse.json({ error: "You can only edit your own comment." }, { status: 403 });
  const feedback = await prisma.shareFeedback.findUnique({ where: { id } });
  return NextResponse.json({ feedback });
});

export const DELETE = withApiErrorHandling(async (_request: Request, context: RouteContext<{ id: string }>) => {
  const [{ id }, user] = await Promise.all([context.params, requireUserOrNull()]);
  if (!user) return NextResponse.json({ error: "Sign in to delete comments." }, { status: 401 });
  const feedback = await prisma.shareFeedback.findUnique({ where: { id }, select: { authorUserId: true } });
  if (!feedback || !canDeleteFeedback(user.id, feedback.authorUserId)) return NextResponse.json({ error: "You can only delete your own comment." }, { status: 403 });
  await prisma.shareFeedback.delete({ where: { id } });
  return NextResponse.json({ success: true });
});
