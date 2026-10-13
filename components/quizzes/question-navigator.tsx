"use client";

import { Check, Flag, ListChecks } from "lucide-react";
import { useEffect, useRef } from "react";
import type { QuizQuestion } from "@/lib/validation/quiz";
import { cn } from "@/lib/utils";

export function hasAnswer(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.values(value).some(hasAnswer);
  return true;
}

export function QuestionNavigator({ questions, answers, index, onNavigate, flagged = new Set<string>() }: {
  questions: QuizQuestion[]; answers: Record<string, unknown>; index: number;
  onNavigate: (index: number) => void; flagged?: Set<string>;
}) {
  const answered = questions.filter(question => hasAnswer(answers[question.id])).length;
  const gridRef = useRef<HTMLElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const grid = gridRef.current;
    const active = activeRef.current;
    if (!grid || !active) return;
    const parent = grid.getBoundingClientRect();
    const item = active.getBoundingClientRect();
    // Scroll only the question grid, leaving the reading position untouched.
    if (item.top < parent.top || item.bottom > parent.bottom) grid.scrollTop += item.top - parent.top - grid.clientHeight / 2 + item.height / 2;
  }, [index]);
  return <aside className="quiz-navigator self-start border border-line bg-surface p-4 shadow-card lg:sticky lg:top-24">
    <h2 className="flex items-center gap-2 text-sm font-semibold"><ListChecks aria-hidden="true" className="h-4 w-4" />Your progress</h2>
    <p className="mt-3 text-sm text-ink-soft" role="status">{answered} of {questions.length} answered</p>
    <div className="quiz-progress-track mt-3" role="progressbar" aria-label="Questions answered" aria-valuemin={0} aria-valuemax={Math.max(1, questions.length)} aria-valuenow={answered}><div style={{ width: `${answered / Math.max(1, questions.length) * 100}%` }} /></div>
    <div className="mt-4 grid grid-cols-2 gap-2"><div className="quiz-stat-complete rounded-lg p-3"><strong className="block text-2xl tabular-nums">{answered}</strong><span className="text-xs">Answered</span></div><div className="quiz-stat-remaining rounded-lg p-3"><strong className="block text-2xl tabular-nums">{questions.length - answered}</strong><span className="text-xs">To explore</span></div></div>
    <p className="mt-3 text-xs leading-relaxed text-ink-soft">Jump ahead or revisit any question. Your answers stay here.</p>
    <p className="mt-4 text-xs font-semibold text-ink-soft">Currently on question {index + 1}</p>
    <nav ref={gridRef} aria-label="Jump to a question" className="mt-2 grid max-h-72 grid-cols-5 gap-2 overflow-y-auto overscroll-contain p-1 lg:grid-cols-4">
      {questions.map((question, position) => <button ref={index === position ? activeRef : undefined} data-answered={hasAnswer(answers[question.id])} data-flagged={flagged.has(question.id)} key={question.id} type="button" onClick={() => onNavigate(position)} aria-current={index === position ? "step" : undefined} aria-label={`Question ${position + 1}, ${hasAnswer(answers[question.id]) ? "answered" : "unanswered"}${flagged.has(question.id) ? ", flagged" : ""}`} className={cn("quiz-nav-number relative flex min-h-11 items-center justify-center gap-1 rounded-control border text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action", "border-line bg-surface text-ink-soft hover:bg-surface-muted")}>
        {position + 1}{flagged.has(question.id) ? <Flag aria-hidden="true" className="h-3 w-3" /> : hasAnswer(answers[question.id]) ? <Check aria-hidden="true" className="h-3 w-3" /> : null}
      </button>)}
    </nav>
    <p className="mt-3 flex flex-wrap gap-3 text-xs text-ink-soft"><span className="inline-flex items-center gap-1"><Check className="h-3 w-3" aria-hidden="true" />Answered</span>{flagged.size > 0 && <span className="inline-flex items-center gap-1"><Flag className="h-3 w-3" aria-hidden="true" />{flagged.size} flagged</span>}</p>
  </aside>;
}
