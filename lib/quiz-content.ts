import { formatCorrectAnswer } from "@/lib/quiz-grading";
import type { QuizQuestion } from "@/lib/validation/quiz";

/** A block must start on its own line, never behind an option label. */
export function quizOptionMarkdown(choice: string, index: number): string {
  return `${String.fromCharCode(65 + index)}.${choice.includes("\n") || choice.startsWith(":::") ? "\n\n" : " "}${choice}`;
}

export function correctAnswerMarkdown(question: QuizQuestion): string {
  switch (question.type) {
    case "multiple_choice": return quizOptionMarkdown(question.choices[question.answer] ?? "Unknown option", question.answer);
    case "multiple_select": return question.answer.map(index => quizOptionMarkdown(question.choices[index] ?? "Unknown option", index)).join("\n\n");
    case "matching": return question.pairs.map(pair => `${pair.left}\n\n**Matches:**\n\n${pair.right}`).join("\n\n---\n\n");
    default: return formatCorrectAnswer(question);
  }
}
