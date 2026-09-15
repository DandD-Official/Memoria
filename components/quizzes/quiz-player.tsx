"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Flag, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { QuizQuestion } from "@/lib/validation/quiz";
import { QuestionInput } from "@/components/quizzes/question-input";
import { formatCorrectAnswer, isAnswerCorrect } from "@/lib/quiz-grading";

interface QuizPlayerProps {
  quizId: string;
  title: string;
  questions: QuizQuestion[];
  testMode: "review" | "exam";
  showExplanations: boolean;
}

export function QuizPlayer({ quizId, title, questions: rawQuestions, testMode, showExplanations }: QuizPlayerProps) {
  const router = useRouter();
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questionOrder, setQuestionOrder] = useState<string[]>([]);
  const [deadline, setDeadline] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);
  const questions = useMemo(() => {
    if (questionOrder.length === 0) return rawQuestions;
    const byId = new Map(rawQuestions.map((question) => [question.id, question]));
    return questionOrder.map((id) => byId.get(id)).filter((question): question is QuizQuestion => Boolean(question));
  }, [questionOrder, rawQuestions]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  const question = questions[index];

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/quizzes/${quizId}/attempts/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ testMode }),
    }).then(async (response) => ({ ok: response.ok, data: await response.json().catch(() => null) }))
      .then(({ ok, data }) => {
        if (cancelled) return;
        if (!ok || !data?.attempt) { setSubmitError(data?.error ?? "Couldn't start this attempt."); setStarting(false); return; }
        setAttemptId(data.attempt.id);
        setQuestionOrder(Array.isArray(data.attempt.questionOrder) ? data.attempt.questionOrder : []);
        setAnswers(data.attempt.answers && typeof data.attempt.answers === "object" ? data.attempt.answers : {});
        setFlagged(new Set(Array.isArray(data.attempt.flagged) ? data.attempt.flagged : []));
        setDeadline(data.attempt.deadline ?? null);
        setStarting(false);
      }).catch(() => { if (!cancelled) { setSubmitError("We couldn't reach the server."); setStarting(false); } });
    return () => { cancelled = true; };
  }, [quizId, testMode]);

  useEffect(() => {
    if (!deadline) { setSecondsLeft(null); return; }
    const update = () => setSecondsLeft(Math.max(0, Math.ceil((new Date(deadline).getTime() - Date.now()) / 1000)));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [deadline]);

  useEffect(() => {
    if (!attemptId || starting) return;
    const timer = window.setTimeout(() => {
      void fetch(`/api/quizzes/${quizId}/attempts/${attemptId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, flagged: Array.from(flagged) }),
      });
    }, 600);
    return () => window.clearTimeout(timer);
  }, [answers, attemptId, flagged, quizId, starting]);

  useEffect(() => {
    if (secondsLeft === 0 && attemptId && !submitting) void handleSubmit();
    // handleSubmit intentionally uses the latest rendered answers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, attemptId]);

  function setAnswer(value: unknown) {
    setAnswers((prev) => ({ ...prev, [question.id]: value }));
    setChecked((prev) => {
      const next = new Set(prev);
      next.delete(question.id);
      return next;
    });
  }

  function toggleFlag() {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(question.id)) next.delete(question.id);
      else next.add(question.id);
      return next;
    });
  }

  async function handleSubmit() {
    if (!attemptId || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`/api/quizzes/${quizId}/attempts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId, answers, flagged: Array.from(flagged) }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.attempt?.id) {
        router.push(`/quizzes/${quizId}/results?attempt=${data.attempt.id}`);
      } else {
        setSubmitError(data?.error ?? "Couldn't submit this attempt. Please try again.");
      }
    } catch {
      setSubmitError("We couldn't reach the server. Check your connection and try again.");
    }
    setSubmitting(false);
  }

  const answeredCount = Object.keys(answers).length;
  const minutes = secondsLeft !== null ? Math.floor(secondsLeft / 60) : null;
  const seconds = secondsLeft !== null ? secondsLeft % 60 : null;

  if (starting) return <div className="mx-auto max-w-2xl"><div className="card h-40 animate-pulse bg-ink/[0.03]" /><p className="mt-3 text-sm text-ink-faint">Starting your attempt…</p></div>;
  if (!attemptId) return <div className="mx-auto max-w-2xl"><p className="text-sm text-danger">{submitError ?? "Couldn't start this attempt."}</p></div>;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl text-ink">{title}</h1>
          <p className="text-xs text-ink-faint">
            {testMode === "review" ? "Review mode · instant feedback" : "Exam mode · feedback after submission"}
          </p>
        </div>
        {secondsLeft !== null && (
          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium", secondsLeft < 60 ? "bg-danger/10 text-danger" : "bg-ink/5 text-ink-soft")}>
            <Clock className="h-3.5 w-3.5" /> {minutes}:{String(seconds).padStart(2, "0")}
          </span>
        )}
      </div>

      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-ink/10">
        <div className="h-full bg-accent transition-[width] duration-150 ease-out" style={{ width: `${((index + 1) / questions.length) * 100}%` }} />
      </div>
      <p className="mb-4 text-xs text-ink-faint">
        Question {index + 1} of {questions.length} · {answeredCount} answered
      </p>

      <div className="card p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <p className="font-display text-lg text-ink">{question.question}</p>
          <button onClick={toggleFlag} aria-label="Flag question">
            <Flag className={cn("h-4 w-4", flagged.has(question.id) ? "fill-accent text-accent-dark" : "text-ink-faint")} />
          </button>
        </div>
        {question.sourceSection && <p className="-mt-2 mb-4 text-xs text-ink-faint">Source: {question.sourceSection}</p>}

        <QuestionInput question={question} value={answers[question.id]} onChange={setAnswer} />

        {testMode === "review" && (
          <div className="mt-5 border-t border-line pt-4">
            {!checked.has(question.id) ? (
              <Button
                variant="outline"
                size="sm"
                disabled={answers[question.id] === undefined}
                onClick={() => setChecked((prev) => new Set(prev).add(question.id))}
              >
                Check answer
              </Button>
            ) : (
              <div
                className={cn(
                  "rounded-lg border p-4 text-sm",
                  isAnswerCorrect(question, answers[question.id])
                    ? "border-success/30 bg-success/5"
                    : "border-danger/30 bg-danger/5"
                )}
              >
                <p className={cn("font-medium", isAnswerCorrect(question, answers[question.id]) ? "text-success" : "text-danger")}>
                  {isAnswerCorrect(question, answers[question.id]) ? "Correct" : "Not quite"}
                </p>
                <p className="mt-2 text-ink"><strong>Correct answer:</strong> {formatCorrectAnswer(question)}</p>
                {showExplanations && <p className="mt-1 text-ink-soft"><strong>Explanation:</strong> {question.explanation || "No detailed explanation was provided."}</p>}
              </div>
            )}
          </div>
        )}
      </div>

      {submitError && <p className="mt-3 text-sm text-danger">{submitError}</p>}

      <div className="mt-5 flex items-center justify-between">
        <Button variant="outline" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}>
          <ChevronLeft className="h-4 w-4" /> Previous
        </Button>
        {index === questions.length - 1 ? (
          <Button onClick={handleSubmit} loading={submitting}>Submit</Button>
        ) : (
          <Button onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}>
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
