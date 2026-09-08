import { NextResponse } from "next/server";
import { withApiErrorHandling, type RouteContext } from "@/lib/api/handler";
import { requireUserOrNull } from "@/lib/auth/session";
import { getBookAccess, getPublicCollectionBySlug } from "@/lib/share-collections-repo";
import { prisma } from "@/lib/db";
import { formatCorrectAnswer } from "@/lib/quiz-grading";
import type { QuizQuestion } from "@/lib/validation/quiz";

export const GET = withApiErrorHandling(async (request: Request, context: RouteContext<{ id: string }>) => {
  const [{ id }, user] = await Promise.all([context.params, requireUserOrNull()]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const book = await prisma.shareCollection.findUnique({ where: { id }, select: { slug: true } });
  if (!book || !(await getBookAccess(user.id, id))) return NextResponse.json({ error: "Book not found." }, { status: 404 });
  const collection = await getPublicCollectionBySlug(book.slug, true, user.id);
  if (!collection) return NextResponse.json({ error: "Book not found." }, { status: 404 });
  const markdown = collectionMarkdown(collection);
  if (new URL(request.url).searchParams.get("format") === "json") {
    const body = JSON.stringify({ format: "memoria-collection-export", version: "1", title: collection.title, description: collection.description, notes: collection.notes, reviewers: collection.reviewers, quizzes: collection.quizzes });
    return new NextResponse(body, { headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="memoria-book-${safe(collection.title)}.json"` } });
  }
  return NextResponse.json({ title: collection.title, subtitle: collection.subtitle, description: collection.description, tocTitle: collection.tocTitle, ownerName: collection.ownerName, markdown });
});

function collectionMarkdown(collection: NonNullable<Awaited<ReturnType<typeof getPublicCollectionBySlug>>>) {
  const chapterTitle = (item: PublicCollectionItem) => item.resourceType === "NOTE" ? collection.notes.find((entry) => entry.id === item.resourceId)?.title : item.resourceType === "REVIEWER" ? collection.reviewers.find((entry) => entry.id === item.resourceId)?.title : collection.quizzes.find((entry) => entry.id === item.resourceId)?.title;
  const rows = [`# ${collection.tocTitle}`, ...collection.items.map((item, index) => `${index + 1}. ${chapterTitle(item) ?? "Unavailable chapter"}`)];
  for (const item of collection.items) {
    if (item.resourceType === "NOTE") {
      const note = collection.notes.find((entry) => entry.id === item.resourceId);
      if (note) rows.push(`\n# ${note.title}\n`, note.description ?? "", note.content);
    } else if (item.resourceType === "REVIEWER") {
      const reviewer = collection.reviewers.find((entry) => entry.id === item.resourceId);
      if (reviewer) rows.push(`\n# ${reviewer.title}\n`, reviewer.description ?? "", reviewer.content);
    } else {
      const quiz = collection.quizzes.find((entry) => entry.id === item.resourceId);
      if (!quiz) continue;
      const questions = quiz.questions as QuizQuestion[];
      rows.push(`\n# ${quiz.title}\n`, quiz.description ?? "", "## Questions");
      questions.forEach((question, index) => rows.push(`${index + 1}. ${question.question}`));
      rows.push("\n## Answer key");
      questions.forEach((question, index) => rows.push(`**${index + 1}. Correct answer:** ${formatCorrectAnswer(question)}\n\n**Explanation:** ${question.explanation ?? "No explanation provided."}`));
    }
  }
  return rows.filter(Boolean).join("\n\n");
}

type PublicCollectionItem = NonNullable<Awaited<ReturnType<typeof getPublicCollectionBySlug>>>["items"][number];

function safe(value: string) { return value.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase() || "book"; }
