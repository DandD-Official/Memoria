import { CheckCircle2, Lightbulb, RotateCcw } from "lucide-react";
import { QuizContent } from "./quiz-content";
import { correctAnswerMarkdown } from "@/lib/quiz-content";
import type { QuizQuestion } from "@/lib/validation/quiz";

export function QuizFeedback({ question, correct, showExplanations = true }: { question: QuizQuestion; correct: boolean; showExplanations?: boolean }) {
  const Icon = correct ? CheckCircle2 : RotateCcw;
  return <div className="quiz-feedback space-y-3" role="status">
    <div className={correct ? "quiz-answer-result" : "quiz-answer-result quiz-answer-retry"}>
      <div className="flex items-center gap-3"><Icon className="h-6 w-6 shrink-0" aria-hidden="true" /><div><p className="font-semibold">{correct ? "You got it!" : "Not quite. You’re learning."}</p><p className="mt-0.5 text-xs">{correct ? "One more connection made." : "Compare your answer, then try again."}</p></div></div>
      <div className="mt-4 border-t border-current/20 pt-3"><p className="mb-2 text-xs font-semibold uppercase tracking-wide">Correct answer</p><QuizContent content={correctAnswerMarkdown(question)} /></div>
    </div>
    {showExplanations && question.explanation && <div className="quiz-explanation"><p className="mb-3 flex items-center gap-2 text-sm font-semibold"><Lightbulb className="h-4 w-4" aria-hidden="true" />Why this works</p><QuizContent content={question.explanation} /></div>}
  </div>;
}
