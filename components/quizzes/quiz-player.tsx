"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Clock, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
  const [saveState, setSaveState] = useState<"saved" | "saving" | "failed">("saved");
  const [retry, setRetry] = useState(0);
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
    setStarting(true);
    fetch(`/api/quizzes/${quizId}/attempts/start`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ testMode }) })
      .then(async (response) => ({ ok: response.ok, data: await response.json().catch(() => null) }))
      .then(({ ok, data }) => {
        if (cancelled) return;
        if (!ok || !data?.attempt) { setSubmitError(data?.error ?? "Unable to start this attempt. Please try again."); setStarting(false); return; }
        setAttemptId(data.attempt.id);
        setQuestionOrder(Array.isArray(data.attempt.questionOrder) ? data.attempt.questionOrder : []);
        setAnswers(data.attempt.answers && typeof data.attempt.answers === "object" ? data.attempt.answers : {});
        setFlagged(new Set(Array.isArray(data.attempt.flagged) ? data.attempt.flagged : []));
        setDeadline(data.attempt.deadline ?? null);
        setStarting(false);
      })
      .catch(() => { if (!cancelled) { setSubmitError("Unable to reach the server. Check your connection and try again."); setStarting(false); } });
    return () => { cancelled = true; };
  }, [quizId, testMode, retry]);

  useEffect(() => {
    if (!deadline) { setSecondsLeft(null); return; }
    const update = () => setSecondsLeft(Math.max(0, Math.ceil((new Date(deadline).getTime() - Date.now()) / 1000)));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [deadline]);

  useEffect(() => {
    if (!attemptId || starting || submitting) return;
    setSaveState("saving");
    const timer = window.setTimeout(() => { void fetch(`/api/quizzes/${quizId}/attempts/${attemptId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers, flagged: Array.from(flagged) }) }).then(response => setSaveState(response.ok ? "saved" : "failed")).catch(() => setSaveState("failed")); }, 600);
    return () => window.clearTimeout(timer);
  }, [answers, attemptId, flagged, quizId, starting, submitting]);

  useEffect(() => {
    if (secondsLeft === 0 && attemptId && !submitting) void handleSubmit();
    // handleSubmit intentionally uses the latest rendered answers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, attemptId]);

  function setAnswer(value: unknown) {
    if (!question) return;
    setAnswers((prev) => ({ ...prev, [question.id]: value }));
    setChecked((prev) => { const next = new Set(prev); next.delete(question.id); return next; });
  }

  function toggleFlag() {
    if (!question) return;
    setFlagged((prev) => { const next = new Set(prev); if (next.has(question.id)) next.delete(question.id); else next.add(question.id); return next; });
  }

  async function handleSubmit() {
    if (!attemptId || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`/api/quizzes/${quizId}/attempts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ attemptId, answers, flagged: Array.from(flagged) }) });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.attempt?.id) router.push(`/quizzes/${quizId}/results?attempt=${data.attempt.id}`);
      else setSubmitError(data?.error ?? "Unable to submit this attempt. Please try again.");
    } catch { setSubmitError("Unable to reach the server. Check your connection and try again."); }
    setSubmitting(false);
  }

  const answeredCount = Object.values(answers).filter(hasAnswer).length;
  const minutes = secondsLeft !== null ? Math.floor(secondsLeft / 60) : null;
  const seconds = secondsLeft !== null ? secondsLeft % 60 : null;

  if (starting) return <div className="mx-auto max-w-2xl" role="status"><div className="card h-44 animate-pulse bg-ink/[0.03]" /><p className="mt-3 text-sm text-ink-faint">Preparing your {testMode === "exam" ? "exam" : "practice session"}…</p></div>;
  if (!attemptId || !question) return <div className="mx-auto max-w-2xl border-y border-line py-8"><h1 className="font-display text-2xl">Your session could not start.</h1><p role="alert" className="mt-4 text-sm text-ink-soft">{submitError ?? "This quiz has no questions yet. Return to the quiz to add questions."}</p><Button className="mt-6" onClick={() => setRetry(value => value + 1)}>Try starting again</Button></div>;

  const submitAction = testMode === "exam"
    ? <ConfirmDialog trigger={<Button loading={submitting}>Submit exam</Button>} title="Submit this exam?" description={`You have answered ${answeredCount} of ${questions.length} questions. You will not be able to change your answers after submitting.`} confirmLabel="Submit exam" onConfirm={handleSubmit} />
    : <Button onClick={handleSubmit} loading={submitting}>Finish quiz</Button>;

  return (
    <div className="mx-auto max-w-3xl pb-8">
      <header className="mb-8 border-b border-line pb-5"><div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><p className="eyebrow">{testMode === "exam" ? "Focus / Exam" : "Focus / Learn as you go"}</p><h1 className="mt-3 break-words font-display text-2xl tracking-tight">{title}</h1></div>{secondsLeft !== null && <span role="timer" aria-label={`${minutes} minutes and ${seconds} seconds remaining`} className={cn("inline-flex items-center gap-2 rounded-control border px-3 py-2 font-mono text-sm tabular-nums", secondsLeft < 60 ? "border-danger text-danger" : "border-line text-ink-soft")}><Clock className="h-4 w-4" />{minutes}:{String(seconds).padStart(2, "0")}</span>}</div></header>
      <div className="mb-7 flex flex-wrap items-center justify-between gap-3"><p className="index-label">Question {index + 1} of {questions.length}</p><p role="status" className={cn("text-xs", saveState === "failed" ? "text-danger" : "text-ink-faint")}>{saveState === "saving" ? "Saving your place?" : saveState === "failed" ? "Answers haven?t synced. Check your connection; submission will retry." : "Your place is saved"}</p></div>
      <div className="mb-8 h-1 bg-line" role="progressbar" aria-label="Questions answered" aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={answeredCount}><div className="h-full bg-action" style={{ width: `${answeredCount / Math.max(questions.length, 1) * 100}%` }} /></div>
      <section aria-label={`Question ${index + 1}`} className="study-prompt">
        <div className="flex items-start gap-5"><div className="min-w-0 flex-1"><p className="mb-4 text-xs text-ink-faint">{question.type.replaceAll("_", " ")}</p><h2 tabIndex={-1} id="active-question" className="break-words font-display text-2xl leading-snug tracking-tight sm:text-3xl">{question.question}</h2></div><button type="button" onClick={toggleFlag} aria-label={flagged.has(question.id) ? "Remove flag from question" : "Flag question for later"} aria-pressed={flagged.has(question.id)} className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full border", flagged.has(question.id) ? "border-action bg-accent-soft text-ink" : "border-line text-ink-faint")}><Flag className={cn("h-4 w-4", flagged.has(question.id) && "fill-accent")} /></button></div>
        {question.sourceSection && <p className="mt-3 text-xs text-ink-faint">From {question.sourceSection}</p>}
        <div className="mt-8"><QuestionInput question={question} value={answers[question.id]} onChange={setAnswer} /></div>
        {testMode === "review" && <div className="mt-7 border-t border-line pt-6">{!checked.has(question.id) ? <Button variant="outline" disabled={!hasAnswer(answers[question.id])} onClick={() => setChecked(prev => new Set(prev).add(question.id))}>Check my understanding</Button> : <div className="border-s-2 border-action ps-5" role="status"><p className={cn("font-medium", isAnswerCorrect(question, answers[question.id]) ? "text-success" : "text-ink")}>{isAnswerCorrect(question, answers[question.id]) ? "That?s it." : "Here?s the connection."}</p><p className="mt-3 text-sm"><strong>Answer:</strong> {formatCorrectAnswer(question)}</p>{showExplanations && <p className="mt-2 text-sm leading-relaxed text-ink-soft">{question.explanation || "This question does not have an explanation yet."}</p>}</div>}</div>}
      </section>
      {submitError && <p className="mt-4 text-sm text-danger" role="alert">{submitError}</p>}
      <div className="sticky bottom-0 z-20 mt-5 flex items-center justify-between gap-3 border-t border-line bg-surface-muted py-4 pb-[max(1rem,env(safe-area-inset-bottom))]"><Button variant="ghost" onClick={() => setIndex(current => Math.max(0, current - 1))} disabled={index === 0}><ChevronLeft className="h-4 w-4" />Previous</Button>{index === questions.length - 1 ? submitAction : <Button onClick={() => setIndex(current => Math.min(questions.length - 1, current + 1))}>Continue<ChevronRight className="h-4 w-4" /></Button>}</div>
      <details className="mt-5 border-y border-line py-4"><summary className="cursor-pointer text-sm text-ink-soft">{answeredCount} answered ? {flagged.size} flagged <span className="ms-2 text-accent-dark">Open question navigator</span></summary><nav aria-label="Jump to a question" className="mt-5 grid grid-cols-5 gap-2 sm:grid-cols-10">{questions.map((item, questionIndex) => <button key={item.id} type="button" onClick={() => setIndex(questionIndex)} aria-label={`Question ${questionIndex + 1}, ${hasAnswer(answers[item.id]) ? "answered" : "unanswered"}${flagged.has(item.id) ? ", flagged" : ""}`} aria-current={index === questionIndex ? "step" : undefined} className={cn("relative flex min-h-11 items-center justify-center gap-1 rounded-control border text-xs", index === questionIndex ? "border-action bg-action text-action-foreground" : "border-line bg-surface text-ink-soft")}><span>{questionIndex + 1}</span>{flagged.has(item.id) ? <Flag className="h-3 w-3" /> : hasAnswer(answers[item.id]) ? <Check className="h-3 w-3" /> : null}</button>)}</nav></details>
    </div>
  );
}

function hasAnswer(value: unknown): boolean {
  if (value === undefined || value === null || value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.values(value).some(hasAnswer);
  return true;
}
