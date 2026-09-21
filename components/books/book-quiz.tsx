"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { QuestionInput } from "@/components/quizzes/question-input";
import { formatCorrectAnswer, isAnswerCorrect } from "@/lib/quiz-grading";
import type { QuizQuestion } from "@/lib/validation/quiz";

/** Book access grants contextual practice, not access to the owner's quiz/attempt API. */
export function BookQuiz({ title, questions }: { title: string; questions: QuizQuestion[] }) {
  const [mode, setMode] = useState<"review" | "exam" | null>(null);
  const [index, setIndex] = useState(0), [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [checked, setChecked] = useState<string[]>([]), [finished, setFinished] = useState(false);
  function start(next: "review" | "exam") { setMode(next); setIndex(0); setAnswers({}); setChecked([]); setFinished(false); }
  const question = questions[index];
  const correct = questions.filter(item => isAnswerCorrect(item, answers[item.id])).length;
  return <section className="mx-auto max-w-3xl space-y-5 rounded-card border border-line bg-surface p-5 sm:p-8" aria-label={`${title} practice`}>
    <div><p className="eyebrow">Practice & recall</p><h2 className="mt-2 font-display text-2xl">{title}</h2><p className="mt-2 text-sm text-ink-soft">{questions.length} questions. This practice stays in your reading session.</p></div>
    {!questions.length ? <p>No questions are available in this chapter.</p> : !mode ? <div className="grid gap-3 sm:grid-cols-2">
      <button className="rounded-card border border-line p-5 text-left hover:bg-surface-muted" onClick={() => start("review")}><strong className="block">Review mode</strong><span className="mt-2 block text-sm text-ink-soft">Check each answer and learn from its explanation.</span></button>
      <button className="rounded-card border border-line p-5 text-left hover:bg-surface-muted" onClick={() => start("exam")}><strong className="block">Exam mode</strong><span className="mt-2 block text-sm text-ink-soft">Answer independently. See your score and answers at the end.</span></button>
    </div> : finished ? <div className="space-y-5"><h3 className="font-display text-xl" role="status">{correct} of {questions.length} correct</h3>{questions.map((item, i) => <details key={item.id} className="rounded-control border border-line p-3"><summary className="cursor-pointer text-sm font-medium">{i + 1}. {item.question} · {isAnswerCorrect(item, answers[item.id]) ? "Correct" : "Review"}</summary><p className="mt-3 text-sm">Answer: {formatCorrectAnswer(item)}</p>{item.explanation && <p className="mt-2 text-sm text-ink-soft">{item.explanation}</p>}</details>)}<Button variant="outline" onClick={() => setMode(null)}>Choose another mode</Button></div> : <>
      <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm text-ink-soft">{mode === "review" ? "Review" : "Exam"} · Question {index + 1} of {questions.length}</p><Button variant="ghost" size="sm" onClick={() => { if (window.confirm("Leave this attempt? Your answers will be cleared.")) setMode(null); }}>Leave attempt</Button></div>
      <h3 className="text-base font-semibold leading-relaxed">{question.question}</h3>
      <QuestionInput question={question} value={answers[question.id]} onChange={value => { setAnswers(current => ({ ...current, [question.id]: value })); setChecked(current => current.filter(id => id !== question.id)); }} />
      {mode === "review" && <Button variant="outline" onClick={() => setChecked(current => [...current, question.id])}>Check answer</Button>}
      {mode === "review" && checked.includes(question.id) && <div role="status" className="rounded-control bg-surface-muted p-4 text-sm"><p className="font-semibold">{isAnswerCorrect(question, answers[question.id]) ? "Correct" : `Answer: ${formatCorrectAnswer(question)}`}</p>{question.explanation && <p className="mt-2 leading-relaxed">{question.explanation}</p>}</div>}
      <div className="flex flex-wrap justify-between gap-2 border-t border-line pt-4"><Button variant="ghost" disabled={!index} onClick={() => setIndex(index - 1)}>Previous</Button>{index < questions.length - 1 ? <Button onClick={() => setIndex(index + 1)}>Next question</Button> : <Button onClick={() => { if (mode === "review" || window.confirm("Submit your exam and reveal the answers?")) setFinished(true); }}>Finish {mode === "review" ? "review" : "exam"}</Button>}</div>
    </>}
  </section>;
}
