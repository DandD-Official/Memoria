import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpenCheck, Clock3, History, ListChecks, PlayCircle } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { getAccessLevelForOwner } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { DeleteQuizButton } from "@/components/quizzes/delete-quiz-button";
import { ShareDialog } from "@/components/sharing/share-dialog";
import { ExportQuizPdfButton } from "@/components/quizzes/export-quiz-pdf-button";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import type { QuizQuestion } from "@/lib/validation/quiz";
import { ResourceActions } from "@/components/library/resource-actions";
import { TagEditor } from "@/components/library/tag-editor";

export default async function QuizDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await requireUser();
  const [quiz, attempts] = await Promise.all([
    prisma.quiz.findUnique({ where: { id: params.id } }),
    prisma.quizAttempt.findMany({ where: { quizId: params.id, userId: user.id, completedAt: { not: null } }, orderBy: { completedAt: "desc" }, take: 10, select: { id: true, score: true, totalQuestions: true, completedAt: true } }),
  ]);
  if (!quiz) notFound();
  const access = await getAccessLevelForOwner(user.id, "QUIZ", params.id, quiz.ownerId);
  if (access === "NONE") notFound();

  const questionCount = Array.isArray(quiz.questions) ? (quiz.questions as unknown[]).length : 0;
  const bestAttempt = attempts.length ? Math.max(...attempts.map((attempt) => Math.round((attempt.score / Math.max(attempt.totalQuestions, 1)) * 100))) : null;

  return (
    <div className="mx-auto max-w-5xl space-y-7">
      <Link href="/quizzes" className="inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink"><ArrowLeft className="h-4 w-4" /> Back to quizzes</Link>

      <header className="ink-panel rounded-panel p-5 shadow-card-hover sm:p-8"><div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Badge tone="accent">{quiz.mode.replace("_", " ")}</Badge><span className="text-xs text-white/55">{questionCount} questions</span></div><h1 className="mt-4 max-w-3xl break-words font-display text-3xl font-medium leading-tight text-white sm:text-4xl">{quiz.title}</h1>{quiz.description && <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/70">{quiz.description}</p>}<p className="mt-4 text-xs text-white/50">Updated {formatDate(quiz.updatedAt)}</p></div><div className="flex shrink-0 items-center gap-3 rounded-card border border-white/15 bg-white/[0.08] p-3"><ListChecks className="h-5 w-5 text-accent" /><span><span className="block text-xs text-white/55">Best recent recall</span><span className="mt-1 block font-display text-2xl text-white">{bestAttempt === null ? "—" : `${bestAttempt}%`}</span></span></div></div></header>

      <div className="flex flex-wrap items-center gap-2 rounded-card border border-line bg-surface p-2 shadow-card"><ExportQuizPdfButton quizId={quiz.id} title={quiz.title} questions={quiz.questions as unknown as QuizQuestion[]} author={user.name} mode={quiz.mode} />{access === "OWNER" && <ShareDialog resourceType="QUIZ" resourceId={quiz.id} />}{access === "OWNER" && <ResourceActions resourceType="QUIZ" resourceId={quiz.id} archived={Boolean(quiz.archivedAt)} favorite={quiz.isFavorite} />}{access === "OWNER" && <DeleteQuizButton quizId={quiz.id} />}</div>

      {access === "OWNER" && <TagEditor resourceType="QUIZ" resourceId={quiz.id} />}

      <section aria-labelledby="mode-title"><div className="mb-4"><p className="section-kicker">Choose how to practice</p><h2 id="mode-title" className="mt-2 section-heading">Start a session</h2></div><div className="grid gap-4 md:grid-cols-2"><Link href={`/quizzes/${quiz.id}/play?mode=review`} className="card interactive-card group p-5 sm:p-6"><span className="flex h-11 w-11 items-center justify-center rounded-control bg-study-soft text-study"><BookOpenCheck className="h-5 w-5" /></span><h3 className="mt-6 font-display text-xl font-medium text-ink">Review mode</h3><p className="mt-2 max-w-md text-sm leading-relaxed text-ink-soft">Check each answer immediately, read the explanation, and build understanding as you go.</p><span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-study">Start review <ArrowRight className="h-4 w-4" /></span></Link><Link href={`/quizzes/${quiz.id}/play?mode=exam`} className="card interactive-card ink-panel group border-panel p-5 sm:p-6"><span className="flex h-11 w-11 items-center justify-center rounded-control bg-accent text-ink"><Clock3 className="h-5 w-5" /></span><h3 className="mt-6 font-display text-xl font-medium text-white">Exam mode</h3><p className="mt-2 max-w-md text-sm leading-relaxed text-white/70">Stay focused, flag uncertain questions, and see your result after you submit.</p><span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-accent">Start exam <ArrowRight className="h-4 w-4" /></span></Link></div></section>

      <section aria-labelledby="attempts-title"><div className="mb-4"><p className="section-kicker">Practice history</p><h2 id="attempts-title" className="mt-2 section-heading">Past attempts</h2></div>{attempts.length === 0 ? <div className="rounded-card border border-dashed border-line-strong bg-surface-muted p-5 text-sm text-ink-soft">Your first result will appear here after you complete a session.</div> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{attempts.map((attempt) => { const percent = Math.round((attempt.score / Math.max(attempt.totalQuestions, 1)) * 100); return <Link key={attempt.id} href={`/quizzes/${quiz.id}/results?attempt=${attempt.id}`} className="card interactive-card flex items-center justify-between gap-4 p-4"><span className="flex min-w-0 items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-ink/5 text-ink-faint"><History className="h-4 w-4" /></span><span className="min-w-0"><span className="block text-sm font-semibold text-ink">{attempt.score}/{attempt.totalQuestions} correct</span><span className="mt-1 block text-xs text-ink-faint">{attempt.completedAt ? formatRelativeTime(attempt.completedAt) : "Completed"}</span></span></span><span className={percent >= 70 ? "font-display text-xl text-study" : "font-display text-xl text-accent-dark"}>{percent}%</span></Link>; })}</div>}</section>
    </div>
  );
}
