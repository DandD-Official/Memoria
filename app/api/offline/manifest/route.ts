import { NextResponse } from "next/server";
import { requireUserOrNull } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { withApiErrorHandling } from "@/lib/api/handler";

// Each page/API still performs its normal permission check during preparation.
export const GET = withApiErrorHandling(async () => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Sign in to prepare offline access." }, { status: 401 });
  const [notes, reviewers, quizzes, collections, workspaces, shares] = await Promise.all([
    prisma.note.findMany({ where: { ownerId: user.id }, select: { id: true } }),
    prisma.reviewer.findMany({ where: { ownerId: user.id }, select: { id: true } }),
    prisma.quiz.findMany({ where: { ownerId: user.id }, select: { id: true } }),
    prisma.shareCollection.findMany({ where: { OR: [{ ownerId: user.id }, { members: { some: { userId: user.id, permission: "EDIT" } } }] }, select: { id: true, kind: true } }),
    prisma.workspace.findMany({ where: { OR: [{ ownerId: user.id }, { members: { some: { userId: user.id } } }] }, select: { id: true } }),
    prisma.resourceShare.findMany({ where: { userId: user.id }, select: { resourceType: true, resourceId: true } }),
  ]);
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
  return NextResponse.json({ userId: user.id, paths, documents: [...new Set(documents)], apis: ["/api/workspaces", ...workspaces.map(workspace => `/api/workspaces/${workspace.id}`), ...collections.map(collection => `/api/collections/${collection.id}/document`)] }, { headers: { "Cache-Control": "no-store" } });
});
