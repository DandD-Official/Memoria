import { NextResponse } from "next/server";
import { requireUserOrNull } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { findNotesByOwner } from "@/lib/notes-repo";
import { findReviewersByOwner } from "@/lib/reviewers-repo";
import { withApiErrorHandling } from "@/lib/api/handler";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** A complete, private, read-only snapshot of the signed-in user's study library. */
export const GET = withApiErrorHandling(async () => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "private, no-store" } });

  const [notes, reviewers, quizzes, diagrams, collections, flashcards, progress, tags] = await Promise.all([
    findNotesByOwner(user.id),
    findReviewersByOwner(user.id),
    prisma.quiz.findMany({ where: { ownerId: user.id }, orderBy: { updatedAt: "desc" }, select: { id: true, title: true, description: true, mode: true, configuration: true, questions: true, archivedAt: true, isFavorite: true, createdAt: true, updatedAt: true, reviewerLinks: { select: { reviewerId: true } }, tags: { select: { tag: { select: { id: true, name: true, color: true } } } } } }),
    prisma.diagram.findMany({ where: { ownerId: user.id }, orderBy: { updatedAt: "desc" }, select: { id: true, title: true, data: true, schemaVersion: true, createdAt: true, updatedAt: true } }),
    prisma.shareCollection.findMany({ where: { ownerId: user.id }, orderBy: { updatedAt: "desc" }, select: { id: true, title: true, subtitle: true, description: true, tocTitle: true, kind: true, subjects: true, isPublished: true, linkPermission: true, allowExport: true, isFavorite: true, expiresAt: true, createdAt: true, updatedAt: true, items: { orderBy: { position: "asc" }, select: { id: true, resourceType: true, resourceId: true, subjectId: true, position: true } } } }),
    prisma.flashcard.findMany({ where: { ownerId: user.id }, orderBy: { createdAt: "asc" }, select: { id: true, reviewerId: true, front: true, back: true, sourceText: true, createdAt: true, updatedAt: true } }),
    prisma.flashcardProgress.findMany({ where: { userId: user.id }, select: { flashcardId: true, dueAt: true, intervalDays: true, easeFactor: true, repetitions: true, lapses: true, lastGrade: true, updatedAt: true } }),
    prisma.tag.findMany({ where: { ownerId: user.id }, orderBy: { name: "asc" }, select: { id: true, name: true, color: true } }),
  ]);

  const mediaIds = new Set<string>();
  const addMediaRefs = (value: string) => { for (const match of value.matchAll(/media:\/\/([a-zA-Z0-9_-]+)/g)) mediaIds.add(match[1]); };
  notes.forEach(note => addMediaRefs(note.content));
  reviewers.forEach(reviewer => addMediaRefs(reviewer.content));
  diagrams.forEach(diagram => addMediaRefs(JSON.stringify(diagram.data)));
  const media = mediaIds.size ? await prisma.media.findMany({ where: { ownerId: user.id, id: { in: [...mediaIds] } }, select: { id: true, mimeType: true, data: true } }) : [];
  const mediaAssets = Object.fromEntries(media.map(item => [`media://${item.id}`, `data:${item.mimeType};base64,${Buffer.from(item.data).toString("base64")}`]));

  return NextResponse.json({
    account: { id: user.id, name: user.name ?? "Your account" },
    syncedAt: new Date().toISOString(),
    notes, reviewers, quizzes, diagrams, collections, flashcards, progress, tags, media: mediaAssets,
  }, { headers: { "Cache-Control": "private, no-store" } });
});
