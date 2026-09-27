import { NextResponse } from "next/server";
import { withApiErrorHandling } from "@/lib/api/handler";
import { requireUserOrNull } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { findNotesByOwner } from "@/lib/notes-repo";
import { findReviewersByOwner } from "@/lib/reviewers-repo";
import { decompressText } from "@/lib/compression";

export const GET = withApiErrorHandling(async () => {
  const sessionUser = await requireUserOrNull();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [user, notes, reviewers, quizzes, attempts, settings, collections, flashcards, reviews, progress, studySessions, tags, notifications, sharesGranted, sharesGiven, pendingInvites, integrations, aiConnections, workspaces] = await Promise.all([
    prisma.user.findUnique({ where: { id: sessionUser.id }, select: { id: true, name: true, email: true, emailVerified: true, createdAt: true, updatedAt: true } }),
    findNotesByOwner(sessionUser.id),
    findReviewersByOwner(sessionUser.id),
    prisma.quiz.findMany({ where: { ownerId: sessionUser.id } }),
    prisma.quizAttempt.findMany({ where: { userId: sessionUser.id } }),
    prisma.userSettings.findUnique({ where: { userId: sessionUser.id } }),
    prisma.shareCollection.findMany({ where: { ownerId: sessionUser.id }, include: { items: true, feedback: true } }),
    prisma.flashcard.findMany({ where: { ownerId: sessionUser.id } }),
    prisma.flashcardReview.findMany({ where: { userId: sessionUser.id } }),
    prisma.flashcardProgress.findMany({ where: { userId: sessionUser.id } }),
    prisma.studySession.findMany({ where: { userId: sessionUser.id } }),
    prisma.tag.findMany({ where: { ownerId: sessionUser.id }, include: { notes: true, reviewers: true, quizzes: true } }),
    prisma.notification.findMany({ where: { userId: sessionUser.id } }),
    prisma.resourceShare.findMany({ where: { userId: sessionUser.id } }),
    prisma.resourceShare.findMany({ where: { ownerId: sessionUser.id } }),
    prisma.resourceInvite.findMany({ where: { ownerId: sessionUser.id } }),
    prisma.integrationConnection.findMany({ where: { userId: sessionUser.id }, select: { provider: true, metadata: true, createdAt: true, updatedAt: true } }),
    prisma.aiConnection.findMany({ where: { userId: sessionUser.id }, select: { provider: true, model: true, createdAt: true, updatedAt: true } }),
    prisma.workspace.findMany({ where: { ownerId: sessionUser.id, expiresAt: { gt: new Date() } }, include: { notes: true, members: true } }),
  ]);
  const safeCollections = collections.map(({ passwordHash: _passwordHash, ...collection }) => ({ ...collection, hasPassword: Boolean(_passwordHash) }));
  const savedWorkspaces = workspaces.map(workspace => ({ ...workspace, notes: workspace.notes.map(note => ({ ...note, content: decompressText(note.content) })) }));
  const body = JSON.stringify({ format: "memoria-account-export", version: 1, exportedAt: new Date().toISOString(), user, settings, notes, reviewers, quizzes, attempts, collections: safeCollections, flashcards, reviews, progress, studySessions, tags, notifications, sharesGranted, sharesGiven, pendingInvites, integrations, aiConnections, workspaces: savedWorkspaces });
  return new NextResponse(body, { headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="memoria-account-${new Date().toISOString().slice(0, 10)}.json"` } });
});
