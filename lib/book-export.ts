import { formatCorrectAnswer } from "@/lib/quiz-grading";
import type { PublicCollection } from "@/lib/share-collections-repo";
import type { QuizQuestion } from "@/lib/validation/quiz";

export function collectionMarkdown(collection: PublicCollection) {
  const chapterTitle = (item: PublicCollection["items"][number]) => item.resourceType === "NOTE"
    ? collection.notes.find((entry) => entry.id === item.resourceId)?.title
    : item.resourceType === "REVIEWER"
      ? collection.reviewers.find((entry) => entry.id === item.resourceId)?.title
      : collection.quizzes.find((entry) => entry.id === item.resourceId)?.title;
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

export function safeBookExportName(value: string) {
  return value.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase() || "book";
}
