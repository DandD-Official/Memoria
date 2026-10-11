"use client";
import { correctAnswerMarkdown } from "@/lib/quiz-content";
import { useState } from "react";
import { BookOpenCheck, Clock3, ListChecks, CheckCircle2, RotateCcw, ChevronRight, ChevronLeft, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuizFeedback } from "@/components/quizzes/quiz-feedback";
import { QuestionInput } from "@/components/quizzes/question-input";
import { QuizContent, QuizAssets } from "@/components/quizzes/quiz-content";
import { QuestionNavigator, hasAnswer } from "@/components/quizzes/question-navigator";
import { isAnswerCorrect } from "@/lib/quiz-grading";
import type { QuizQuestion } from "@/lib/validation/quiz";

/** Book access grants local practice without accessing the owner's attempts. */
export function BookQuiz({ title, questions, resolvedAssets }: { title: string; questions: QuizQuestion[]; resolvedAssets?: Record<string, string | null> }) {
  return <QuizAssets.Provider value={resolvedAssets}><LocalQuiz title={title} questions={questions} /></QuizAssets.Provider>;
}

function LocalQuiz({ title, questions }: { title: string; questions: QuizQuestion[] }) {
  const [mode, setMode] = useState<"review" | "exam" | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [checked, setChecked] = useState<string[]>([]);
  const [finished, setFinished] = useState(false);
  function start(next: "review" | "exam") { setMode(next); setIndex(0); setAnswers({}); setChecked([]); setFinished(false); }
  const question = questions[index];
  const correct = questions.filter(item => isAnswerCorrect(item, answers[item.id])).length;
  const answered = questions.filter(item => hasAnswer(answers[item.id])).length;
  return <section className="quiz-experience mx-auto max-w-6xl space-y-6" aria-label={`${title} practice`}>
    <header className="quiz-hero p-5 shadow-card sm:p-8"><div className="flex items-center gap-3"><span className="quiz-hero-icon rounded-xl p-3"><ListChecks className="h-6 w-6" aria-hidden="true" /></span><div><p className="text-xs font-semibold uppercase tracking-widest text-ink-soft">Practice & recall</p><h2 className="mt-1 break-words font-display text-2xl text-ink">{title}</h2></div></div><p className="mt-4 text-sm text-ink-soft">{questions.length} questions. Practice at your pace; answers stay in this session.</p></header>
    {!questions.length ? <p>No questions are available in this chapter.</p> : !mode ? <div className="grid gap-4 sm:grid-cols-2">
      <button type="button" className="card quiz-mode-review interactive-card p-6 text-left" onClick={() => start("review")}><BookOpenCheck className="mb-5 h-6 w-6 text-study" aria-hidden="true" /><strong className="block font-display text-xl">Review mode</strong><span className="mt-2 block text-sm text-ink-soft">Check each answer and learn from its explanation.</span></button>
      <button type="button" className="card quiz-mode-exam interactive-card p-6 text-left" onClick={() => start("exam")}><Clock3 className="mb-5 h-6 w-6" aria-hidden="true" /><strong className="block font-display text-xl">Exam mode</strong><span className="mt-2 block text-sm text-ink-soft">Test your recall. Reveal your score when you finish.</span></button>
    </div> : finished ? <div className="space-y-5"><div className="card p-6"><CheckCircle2 className="h-7 w-7 text-study" aria-hidden="true" /><h3 className="mt-3 font-display text-3xl" role="status">{correct} of {questions.length} correct</h3><p className="mt-2 text-sm text-ink-soft">Open a question to explore the answer.</p></div>{questions.map((item, i) => <details key={item.id} className="card p-4"><summary className="cursor-pointer text-sm font-medium">Question {i + 1} / {isAnswerCorrect(item, answers[item.id]) ? "Correct" : "Review"}</summary><div className="mt-4 space-y-4"><QuizContent content={item.question} /><div className="rounded-control bg-surface-muted p-4"><p className="mb-2 text-xs font-semibold">Correct answer</p><QuizContent content={correctAnswerMarkdown(item)} />{item.explanation && <QuizContent content={item.explanation} />}</div></div></details>)}<Button variant="outline" onClick={() => setMode(null)}><RotateCcw className="h-4 w-4" />Practice again</Button></div> : <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
      <div className="quiz-question-panel min-w-0 space-y-5 p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex flex-wrap items-center gap-3"><span className="quiz-type-badge"><PenLine className="h-3.5 w-3.5" aria-hidden="true" />{question.type.replaceAll("_", " ")}</span><h3 className="text-sm font-semibold text-ink-soft">Question {index + 1} <span className="font-normal">of {questions.length}</span></h3></div><Button variant="ghost" size="sm" onClick={() => { if (window.confirm("Leave this attempt? Your answers will be cleared.")) setMode(null); }}>Leave attempt</Button></div>
        <div className="quiz-prompt"><QuizContent content={question.question} /></div>
        <div className="quiz-answer-area"><p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-soft"><PenLine className="h-4 w-4" aria-hidden="true" />Your answer</p><QuestionInput question={question} value={answers[question.id]} onChange={value => { setAnswers(current => ({ ...current, [question.id]: value })); setChecked(current => current.filter(id => id !== question.id)); }} /></div>
        {mode === "review" && !checked.includes(question.id) && <Button variant="outline" disabled={!hasAnswer(answers[question.id])} onClick={() => setChecked(current => [...current, question.id])}>Check answer</Button>}
        {mode === "review" && checked.includes(question.id) && <QuizFeedback question={question} correct={isAnswerCorrect(question, answers[question.id])} />}
        <div className="flex flex-wrap justify-between gap-2 border-t border-line pt-4"><Button variant="ghost" disabled={!index} onClick={() => setIndex(index - 1)}><ChevronLeft className="h-4 w-4" />Previous</Button>{index < questions.length - 1 ? <Button onClick={() => setIndex(index + 1)}>{hasAnswer(answers[question.id]) ? "Next question" : "Skip for now"}<ChevronRight className="h-4 w-4" /></Button> : <Button onClick={() => { if (window.confirm(`Finish with ${answered} of ${questions.length} answered and reveal your results?`)) setFinished(true); }}>Finish {mode === "review" ? "review" : "exam"}</Button>}</div>
      </div>
      <QuestionNavigator questions={questions} answers={answers} index={index} onNavigate={setIndex} />
    </div>}
  </section>;
}
