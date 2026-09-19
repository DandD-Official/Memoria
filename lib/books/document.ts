import type { PublicCollection } from "@/lib/share-collections-repo";
import { formatCorrectAnswer } from "@/lib/quiz-grading";
import type { QuizQuestion } from "@/lib/validation/quiz";

export interface BookChapter { id: string; title: string; description?: string | null; kind: "NOTE" | "REVIEWER" | "QUIZ"; content: string }
export interface BookDocument { title: string; subtitle?: string | null; description?: string | null; author: string; tocTitle: string; chapters: BookChapter[]; assets?: Record<string, string | null> }

export function quizChapterMarkdown(questions: QuizQuestion[]): string {
  const questionsText = questions.map((question, index) => {
    const options = question.type === "multiple_choice" || question.type === "multiple_select"
      ? question.choices.map((choice, i) => `${String.fromCharCode(65 + i)}. ${choice}`).join("\n\n")
      : question.type === "true_false" ? "□ True    □ False"
      : question.type === "matching" ? question.pairs.map(pair => `- ${pair.left}: ____________________`).join("\n")
      : "Answer: ________________________________________";
    return `### ${index + 1}. ${question.question}\n\n${options}`;
  });
  return [...questionsText, "## Answer key", ...questions.map((question, index) => `**${index + 1}. ${formatCorrectAnswer(question)}**\n\n${question.explanation ?? "No explanation provided."}`)].join("\n\n");
}

export function collectionBookDocument(collection: PublicCollection): BookDocument {
  return {
    title: collection.title, subtitle: collection.subtitle, description: collection.description,
    author: collection.ownerName, tocTitle: collection.tocTitle,
    chapters: collection.items.filter(item => item.resourceType !== "DIAGRAM").map(item => {
      const resource = item.resourceType === "NOTE" ? collection.notes.find(row => row.id === item.resourceId)
        : item.resourceType === "REVIEWER" ? collection.reviewers.find(row => row.id === item.resourceId)
        : collection.quizzes.find(row => row.id === item.resourceId);
      return { id: item.id, title: resource?.title ?? "Unavailable chapter", description: resource?.description, kind: item.resourceType as BookChapter["kind"],
        content: resource ? "content" in resource ? resource.content : quizChapterMarkdown(resource.questions as QuizQuestion[]) : "This chapter is no longer available." };
    }),
  };
}
