import { NextResponse } from "next/server";
import { requireUserOrNull } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { withApiErrorHandling } from "@/lib/api/handler";

// Only account-owned documents are downloaded automatically. Shared content
// is saved when opened, after its normal server permission checks.
export const GET = withApiErrorHandling(async () => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Sign in to prepare offline access." }, { status: 401 });
  const [notes, reviewers] = await Promise.all([
    prisma.note.findMany({ where: { ownerId: user.id }, select: { id: true } }),
    prisma.reviewer.findMany({ where: { ownerId: user.id }, select: { id: true } }),
  ]);
  return NextResponse.json({ userId: user.id, paths: ["/dashboard", "/notes", "/reviewers", "/library", "/favorites", "/archive", "/settings", ...notes.map(note => `/notes/${note.id}`), ...reviewers.map(reviewer => `/reviewers/${reviewer.id}`)] }, { headers: { "Cache-Control": "no-store" } });
});
