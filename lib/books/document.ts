import type { PublicCollection } from "@/lib/share-collections-repo";
import { formatCorrectAnswer } from "@/lib/quiz-grading";
import type { QuizQuestion } from "@/lib/validation/quiz";
import { subjectOrder } from "./notebooks";

export interface BookChapter { id: string; title: string; description?: string | null; kind: "NOTE" | "REVIEWER" | "QUIZ"; content: string; subjectId?: string | null; subjectTitle?: string; quiz?: QuizQuestion[] }
export interface BookDocument { title: string; kind?: "BOOK" | "NOTEBOOK"; subtitle?: string | null; description?: string | null; author: string; tocTitle: string; chapters: BookChapter[]; assets?: Record<string, string | null> }

export function chapterBody(content: string, title: string): string {
  const match = content.match(/^\s*#{1,2}\s+([^\n]+)\r?\n/);
  return match && match[1].trim().toLocaleLowerCase() === title.trim().toLocaleLowerCase() ? content.slice(match[0].length).trimStart() : content;
}

export function quizChapterMarkdown(questions: QuizQuestion[]): string {
  const questionsText = questions.map((question, index) => {
    const options = question.type === "multiple_choice" || question.type === "multiple_select"
      ? question.choices.map((choice, i) => `${String.fromCharCode(65 + i)}. ${choice}`).join("\n\n")
      : question.type === "true_false" ? "□ True    □ False"
      : question.type === "matching" ? `${question.pairs.map(pair => `- ${pair.left}: ____________________`).join("\n")}\n\nOptions: ${question.pairs.map(pair => pair.right).sort().map((right, index) => `${String.fromCharCode(65 + index)}. ${right}`).join(" · ")}`
      : "Answer: ________________________________________";
    return `### ${index + 1}. ${question.question}\n\n${options}`;
  });
  return [...questionsText, "## Answer key", ...questions.map((question, index) => `**${index + 1}. ${formatCorrectAnswer(question)}**\n\n${question.explanation ?? "No explanation provided."}`)].join("\n\n");
}

export function collectionBookDocument(collection: PublicCollection): BookDocument {
  return {
    title: collection.title, kind: collection.kind ?? "BOOK", subtitle: collection.subtitle, description: collection.description,
    author: collection.ownerName, tocTitle: collection.tocTitle,
    chapters: subjectOrder(collection.items.filter(item => item.resourceType !== "DIAGRAM"), collection.subjects ?? []).map(item => {
      const resource = item.resourceType === "NOTE" ? collection.notes.find(row => row.id === item.resourceId)
        : item.resourceType === "REVIEWER" ? collection.reviewers.find(row => row.id === item.resourceId)
        : collection.quizzes.find(row => row.id === item.resourceId);
      return { id: item.id, title: resource?.title ?? "Unavailable chapter", description: resource?.description, kind: item.resourceType as BookChapter["kind"],
        subjectId: item.subjectId,
        subjectTitle: collection.subjects?.find(subject => subject.id === item.subjectId)?.title ?? (collection.kind === "NOTEBOOK" ? "Unfiled" : undefined),
        quiz: resource && "questions" in resource ? resource.questions as QuizQuestion[] : undefined,
        content: resource ? "content" in resource ? chapterBody(resource.content, resource.title) : quizChapterMarkdown(resource.questions as QuizQuestion[]) : "This chapter is no longer available." };
    }),
  };
}
