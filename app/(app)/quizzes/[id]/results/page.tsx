import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { getAccessLevelForOwner } from "@/lib/permissions";
import type { QuizQuestion } from "@/lib/validation/quiz";
import { formatCorrectAnswer } from "@/lib/quiz-grading";
import { PageShell } from "@/components/ui/page";
import { ButtonLink } from "@/components/ui/button";

export default async function QuizResultsPage(props: { params: Promise<{ id: string }>; searchParams: Promise<{ attempt?: string; show?: string }> }) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const user = await requireUser();
  const attemptQuery = searchParams.attempt ? prisma.quizAttempt.findFirst({ where: { id: searchParams.attempt, quizId: params.id, userId: user.id } }) : prisma.quizAttempt.findFirst({ where: { quizId: params.id, userId: user.id, completedAt: { not: null } }, orderBy: { completedAt: "desc" } });
  const [quiz, attempt] = await Promise.all([prisma.quiz.findUnique({ where: { id: params.id } }), attemptQuery]);
  if (!quiz) notFound();
  const access = await getAccessLevelForOwner(user.id, "QUIZ", params.id, quiz.ownerId);
  if (access === "NONE" || !attempt || attempt.status === "IN_PROGRESS") notFound();

  const rawQuestions = quiz.questions as unknown as QuizQuestion[];
  const order = Array.isArray(attempt.questionOrder) ? attempt.questionOrder as string[] : [];
  const byId = new Map(rawQuestions.map((question) => [question.id, question]));
  const questions = order.length ? order.map((id) => byId.get(id)).filter((question): question is QuizQuestion => Boolean(question)) : rawQuestions;
  const gradedAnswers = attempt.answers as Record<string, { given: unknown; correct: boolean }>;
  const percentage = Math.round((attempt.score / Math.max(attempt.totalQuestions, 1)) * 100);
  const missed = questions.filter((question) => !gradedAnswers[question.id]?.correct).length;

  const onlyMissed = searchParams.show === "missed";
  const resultsHref = `/quizzes/${quiz.id}/results?attempt=${attempt.id}`;

  return (
    <PageShell>
      <Link href={`/quizzes/${quiz.id}`} className="inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink"><ArrowLeft className="h-4 w-4" /> Back to quiz</Link>
      <section className="grid gap-6 border-y border-line py-8 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div><p className="eyebrow">Session complete</p><h1 className="mt-3 break-words font-display text-3xl tracking-tight sm:text-4xl">{quiz.title}</h1><p className="mt-4 text-sm text-ink-soft">You answered {attempt.score} of {attempt.totalQuestions} questions correctly. {missed > 0 ? `Return to the ${missed} ${missed === 1 ? "question" : "questions"} that need another look.` : "Every answer was correct. Return to this material later to see what stays."}</p><p className="mt-3 text-xs text-ink-faint">{attempt.testMode === "EXAM" ? "Exam mode" : "Review mode"}</p></div>
        <div className="flex flex-wrap items-center gap-5 sm:flex-col sm:items-end"><div><span className="font-display text-5xl tabular-nums">{percentage}%</span><p className="mt-1 text-xs text-ink-soft">of questions correct</p></div><ButtonLink href={`/quizzes/${quiz.id}/play?mode=${attempt.testMode === "EXAM" ? "exam" : "review"}`} variant="outline"><RotateCcw className="h-4 w-4" aria-hidden="true" />Practice again</ButtonLink></div>
      </section>

      <section aria-labelledby="review-title"><div className="mb-4 flex items-end justify-between gap-4"><div><p className="section-kicker">Learn from the result</p><h2 id="review-title" className="mt-2 section-heading">Question review</h2></div><Link href="/progress" className="hidden items-center gap-1 text-sm font-medium text-accent-dark hover:text-ink sm:inline-flex">See progress <ArrowRight className="h-3.5 w-3.5" /></Link></div><nav aria-label="Filter question review" className="mb-5 flex flex-wrap gap-3"><Link href={resultsHref} aria-current={!onlyMissed ? "page" : undefined} className={`inline-flex min-h-11 items-center rounded-control border px-3 text-sm ${!onlyMissed ? "border-action bg-accent-soft font-semibold" : "border-line text-ink-soft"}`}>All questions ({questions.length})</Link><Link href={`${resultsHref}&show=missed`} aria-current={onlyMissed ? "page" : undefined} className={`inline-flex min-h-11 items-center rounded-control border px-3 text-sm ${onlyMissed ? "border-action bg-accent-soft font-semibold" : "border-line text-ink-soft"}`}>To revisit ({missed})</Link></nav>{onlyMissed && missed === 0 && <p className="py-5 text-sm text-ink-soft">Nothing to revisit from this attempt. All your answers were correct.</p>}<div className="space-y-3">{questions.map((question, index) => ({ question, index })).filter(({ question }) => !onlyMissed || !gradedAnswers[question.id]?.correct).map(({ question, index }) => { const graded = gradedAnswers[question.id]; const correct = Boolean(graded?.correct); return <article key={question.id} className={`rounded-card border p-4 sm:p-5 ${correct ? "border-study/20 bg-study-soft/35" : "border-accent/25 bg-accent-soft/25"}`}><div className="flex items-start gap-3"><span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${correct ? "bg-study-soft text-study" : "bg-accent-soft text-accent-dark"}`}>{correct ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <XCircle className="h-4 w-4" aria-hidden="true" />}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-baseline justify-between gap-2"><p className="text-sm font-semibold text-ink">{index + 1}. {question.question}</p><span className={`text-xs font-semibold ${correct ? "text-study" : "text-accent-dark"}`}>{correct ? "Correct" : "Review this"}</span></div>{!correct && <p className="mt-3 text-xs text-ink-faint">Your answer: {formatGiven(graded?.given)}</p>}<p className="mt-2 text-sm text-ink"><strong>Correct answer:</strong> {formatCorrectAnswer(question)}</p>{question.explanation && <p className="mt-2 text-sm leading-relaxed text-ink-soft"><strong className="text-ink">Why:</strong> {question.explanation}</p>}{question.sourceSection && <p className="mt-3 text-xs text-ink-faint">From {question.sourceSection}</p>}</div></div></article>; })}</div></section>
    </PageShell>
  );
}

function formatGiven(given: unknown): string {
  if (given === null || given === undefined) return "No answer";
  if (typeof given === "object") return JSON.stringify(given);
  return String(given);
}
