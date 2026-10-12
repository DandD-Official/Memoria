import { NextResponse } from "next/server";
import { requireUserOrNull } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { withApiErrorHandling } from "@/lib/api/handler";
import { createHash } from "node:crypto";

// Each page/API still performs its normal permission check during preparation.
export const GET = withApiErrorHandling(async () => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Sign in to prepare offline access." }, { status: 401 });
  const [notes, reviewers, quizzes, collections, workspaces, shares, settings, unreadNotifications, reviewActivity] = await Promise.all([
    prisma.note.findMany({ where: { ownerId: user.id }, select: { id: true, updatedAt: true }, orderBy: { id: "asc" } }),
    prisma.reviewer.findMany({ where: { ownerId: user.id }, select: { id: true, updatedAt: true }, orderBy: { id: "asc" } }),
    prisma.quiz.findMany({ where: { ownerId: user.id }, select: { id: true, updatedAt: true }, orderBy: { id: "asc" } }),
    prisma.shareCollection.findMany({ where: { OR: [{ ownerId: user.id }, { members: { some: { userId: user.id, permission: "EDIT" } } }] }, select: { id: true, kind: true } }),
    prisma.workspace.findMany({ where: { OR: [{ ownerId: user.id }, { members: { some: { userId: user.id } } }] }, select: { id: true } }),
    prisma.resourceShare.findMany({ where: { userId: user.id }, select: { resourceType: true, resourceId: true } }),
    prisma.userSettings.findUnique({ where: { userId: user.id }, select: { updatedAt: true } }),
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
    prisma.flashcardReview.aggregate({ where: { userId: user.id, reviewedAt: { gte: new Date(Date.now() - 30 * 86_400_000) } }, _count: true, _max: { reviewedAt: true } }),
  ]);
  const buildVersion = process.env.MEMORIA_BUILD_VERSION || "development";
  const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
  const versions: Record<string, string> = {};
  // Use document versions for payloads. Keep live lists/session-dependent page
  // snapshots fresh; their data can change independently of a document's text.
  for (const [section, resources] of [["notes", notes], ["reviewers", reviewers]] as const) {
    for (const resource of resources) versions[`/api/${section}/${resource.id}`] = digest([buildVersion, resource.updatedAt]);
  }
  // Detail pages also contain related-library links and account preferences.
  // Invalidate those snapshots conservatively when any of these inputs changes.
  const detailVersion = digest([buildVersion, notes, reviewers, quizzes, settings, unreadNotifications, reviewActivity, user.id, user.name, user.sessionId, user.sessionConflict, user.sessionConflictDevice, user.currentSessionDevice, new Date().toISOString().slice(0, 10)]);
  for (const [section, resources] of [["notes", notes], ["reviewers", reviewers], ["quizzes", quizzes]] as const) {
    for (const resource of resources) versions[`/${section}/${resource.id}`] = detailVersion;
  }
  const documents = [...notes.map(note => `/api/notes/${note.id}`), ...reviewers.map(reviewer => `/api/reviewers/${reviewer.id}`)];
  const sharedPaths = shares.flatMap(share => {
    const section = { NOTE: "notes", REVIEWER: "reviewers", QUIZ: "quizzes", DIAGRAM: "diagrams" }[share.resourceType];
    if (section === "notes" || section === "reviewers") documents.push(`/api/${section}/${share.resourceId}`);
    return [`/${section}/${share.resourceId}`];
  });
  const paths = [...new Set([
    "/dashboard", "/notes", "/reviewers", "/library", "/favorites", "/archive", "/settings",
    "/study", "/study/review", "/quizzes", "/books", "/notebooks", "/workspaces", "/shared", "/progress", "/diagrams",
    ...notes.map(note => `/notes/${note.id}`),
    ...reviewers.flatMap(reviewer => [`/reviewers/${reviewer.id}`, `/study/flashcards/${reviewer.id}`]),
    ...quizzes.map(quiz => `/quizzes/${quiz.id}`),
    ...collections.map(collection => `/${collection.kind === "NOTEBOOK" ? "notebooks" : "books"}/${collection.id}`),
    ...workspaces.map(workspace => `/workspaces/${workspace.id}`), ...sharedPaths,
  ])];
  return NextResponse.json({ userId: user.id, buildVersion, versions, paths, documents: [...new Set(documents)], apis: ["/api/workspaces", ...workspaces.map(workspace => `/api/workspaces/${workspace.id}`), ...collections.map(collection => `/api/collections/${collection.id}/document`)] }, { headers: { "Cache-Control": "no-store" } });
});
