import Link from "next/link";
import { FileInput, Layers, ListChecks, PlayCircle, FileText, TrendingUp } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageShell, SectionHeader } from "@/components/ui/page";
import { ResourceCard, type ResourceKind } from "@/components/library/resource-card";
import { formatRelativeTime } from "@/lib/utils";

const quickActions = [
  { href: "/notes/import", label: "Import Memory", description: "Bring in notes or documents", icon: FileInput },
  { href: "/reviewers", label: "Build reviewer", description: "Shape material for revision", icon: Layers },
  { href: "/quizzes", label: "Create quiz", description: "Turn material into questions", icon: ListChecks },
  { href: "/study", label: "Start studying", description: "Continue a focused session", icon: PlayCircle },
];

export default async function DashboardPage() {
  const user = await requireUser();
  const [recentNotes, recentReviewers, recentQuizzes, recentAttempts, noteCount, reviewerCount, quizCount, quizAttemptCount] = await Promise.all([
    prisma.note.findMany({ where: { ownerId: user.id, archivedAt: null }, orderBy: { updatedAt: "desc" }, take: 8, select: { id: true, title: true, updatedAt: true } }),
    prisma.reviewer.findMany({ where: { ownerId: user.id, archivedAt: null }, orderBy: { updatedAt: "desc" }, take: 8, select: { id: true, title: true, updatedAt: true } }),
    prisma.quiz.findMany({ where: { ownerId: user.id, archivedAt: null }, orderBy: { updatedAt: "desc" }, take: 8, select: { id: true, title: true, updatedAt: true } }),
    prisma.quizAttempt.findMany({ where: { userId: user.id, completedAt: { not: null } }, orderBy: { completedAt: "desc" }, take: 4, select: { score: true, totalQuestions: true } }),
    prisma.note.count({ where: { ownerId: user.id, archivedAt: null } }),
    prisma.reviewer.count({ where: { ownerId: user.id, archivedAt: null } }),
    prisma.quiz.count({ where: { ownerId: user.id, archivedAt: null } }),
    prisma.quizAttempt.count({ where: { userId: user.id, completedAt: { not: null } } }),
  ]);

  const memories: Array<{ id: string; title: string; updatedAt: Date; kind: ResourceKind; label: string; href: string }> = [
    ...recentNotes.map((item) => ({ ...item, kind: "note" as const, label: "Memory", href: `/notes/${item.id}` })),
    ...recentReviewers.map((item) => ({ ...item, kind: "reviewer" as const, label: "Reviewer", href: `/reviewers/${item.id}` })),
    ...recentQuizzes.map((item) => ({ ...item, kind: "quiz" as const, label: "Quiz", href: `/quizzes/${item.id}` })),
  ].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()).slice(0, 8);
  const memoryCount = noteCount + reviewerCount + quizCount;
  const avgScore = recentAttempts.length > 0 ? Math.round((recentAttempts.reduce((sum, attempt) => sum + attempt.score / Math.max(attempt.totalQuestions, 1), 0) / recentAttempts.length) * 100) : null;

  return (
    <PageShell>
      <section className="relative overflow-hidden rounded-panel border border-line bg-surface-raised px-5 py-7 shadow-card sm:px-8 sm:py-9">
        <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-accent-soft/75 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute bottom-0 left-8 h-px w-32 bg-gradient-to-r from-accent to-transparent" aria-hidden="true" />
        <div className="relative max-w-2xl">
          <p className="eyebrow">Your learning workspace</p>
          <h1 className="mt-2 font-display text-display-lg font-medium text-ink">Welcome back{user.name ? `, ${user.name.split(" ")[0]}` : ""}</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft sm:text-base">Turn today&apos;s notes into knowledge you can return to, connect, and remember.</p>
        </div>
      </section>

      <section aria-labelledby="quick-actions-title">
        <h2 id="quick-actions-title" className="sr-only">Quick actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href} className="card interactive-card group flex min-h-24 items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control border border-accent/20 bg-accent-soft">
                <action.icon className="h-[1.125rem] w-[1.125rem] text-accent-dark transition-transform duration-200 group-hover:scale-110" aria-hidden="true" />
              </div>
              <div>
                <span className="block text-sm font-semibold text-ink">{action.label}</span>
                <span className="mt-0.5 block text-xs leading-snug text-ink-faint">{action.description}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {memoryCount > 0 && (
        <section aria-label="Learning overview" className="grid gap-3 sm:grid-cols-3">
          <Card variant="muted" className="p-4"><p className="eyebrow text-ink-faint">Library</p><p className="mt-2 font-display text-3xl text-ink">{memoryCount}</p><p className="mt-1 text-xs text-ink-soft">Memories and study resources</p></Card>
          <Card variant="muted" className="p-4"><p className="eyebrow text-ink-faint">Practice</p><p className="mt-2 font-display text-3xl text-ink">{quizAttemptCount}</p><p className="mt-1 text-xs text-ink-soft">Assessments completed</p></Card>
          <Card variant="muted" className="p-4"><p className="eyebrow text-ink-faint">Recent recall</p><p className="mt-2 flex items-center gap-2 font-display text-3xl text-ink">{avgScore !== null ? `${avgScore}%` : "—"}{avgScore !== null && <TrendingUp className="h-4 w-4 text-success" aria-hidden="true" />}</p><p className="mt-1 text-xs text-ink-soft">Average across recent quizzes</p></Card>
        </section>
      )}

      <section>
        <SectionHeader title="Recent work" description="Your latest Memories, reviewers, and quizzes." />
        {memories.length === 0 ? (
          <EmptyState icon={FileText} title="Your workspace is ready" description="Import a note or document to create your first Memory." actionLabel="Import your first Memory" actionHref="/notes/import" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {memories.map((memory) => <ResourceCard key={`${memory.kind}-${memory.id}`} href={memory.href} kind={memory.kind} title={memory.title} badge={memory.label} meta={formatRelativeTime(memory.updatedAt)} className="min-h-36" />)}
          </div>
        )}
      </section>
    </PageShell>
  );
}
