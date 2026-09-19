import Link from "next/link";
import { ArrowRight, ArrowUpRight, FileText, Layers3, ListChecks, Workflow, RotateCcw, Play, Plus, BookOpen } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { PageShell } from "@/components/ui/page";
import { ButtonLink } from "@/components/ui/button";
import { ResourceCard, type ResourceKind } from "@/components/library/resource-card";
import { formatRelativeTime } from "@/lib/utils";

export default async function DashboardPage() {
  const user = await requireUser();
  const now = new Date();
  const [notes, reviewers, quizzes, diagrams, attempts, dueCount, activeAttempt, tags, spaces] = await Promise.all([
    prisma.note.findMany({ where: { ownerId: user.id, archivedAt: null }, orderBy: { updatedAt: "desc" }, take: 4, select: { id: true, title: true, updatedAt: true } }),
    prisma.reviewer.findMany({ where: { ownerId: user.id, archivedAt: null }, orderBy: { updatedAt: "desc" }, take: 4, select: { id: true, title: true, updatedAt: true } }),
    prisma.quiz.findMany({ where: { ownerId: user.id, archivedAt: null }, orderBy: { updatedAt: "desc" }, take: 4, select: { id: true, title: true, updatedAt: true } }),
    prisma.diagram.findMany({ where: { ownerId: user.id }, orderBy: { updatedAt: "desc" }, take: 3, select: { id: true, title: true, updatedAt: true } }),
    prisma.quizAttempt.findMany({ where: { userId: user.id, status: "COMPLETED", quiz: { archivedAt: null } }, orderBy: { completedAt: "desc" }, take: 10, select: { id: true, score: true, totalQuestions: true, quiz: { select: { id: true, title: true } } } }),
    prisma.flashcard.count({ where: { ownerId: user.id, OR: [{ progress: { none: { userId: user.id } } }, { progress: { some: { userId: user.id, dueAt: { lte: now } } } }] } }),
    prisma.quizAttempt.findFirst({ where: { userId: user.id, status: "IN_PROGRESS", quiz: { archivedAt: null }, OR: [{ deadline: null }, { deadline: { gt: now } }] }, orderBy: { startedAt: "desc" }, select: { id: true, testMode: true, quiz: { select: { id: true, title: true } } } }),
    prisma.tag.findMany({ where: { ownerId: user.id }, orderBy: { name: "asc" }, take: 8, select: { id: true, name: true } }),
    prisma.shareCollection.findMany({ where: { ownerId: user.id }, orderBy: { updatedAt: "desc" }, take: 3, select: { id: true, title: true, _count: { select: { items: true } } } }),
  ]);
  const recent: { id: string; title: string; updatedAt: Date; kind: ResourceKind; href: string }[] = [
    ...notes.map(item => ({ ...item, kind: "note" as const, href: `/notes/${item.id}` })),
    ...reviewers.map(item => ({ ...item, kind: "reviewer" as const, href: `/reviewers/${item.id}` })),
    ...quizzes.map(item => ({ ...item, kind: "quiz" as const, href: `/quizzes/${item.id}` })),
    ...diagrams.map(item => ({ ...item, kind: "diagram" as const, href: `/diagrams?open=${item.id}` })),
  ].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  const latestByQuiz = attempts.filter((item, index) => attempts.findIndex(other => other.quiz.id === item.quiz.id) === index);
  const weak = latestByQuiz.find(item => item.score < item.totalQuestions);
  const next = activeAttempt ? { kicker: "An open thread", title: activeAttempt.quiz.title, description: "You have a session in progress. Pick up from your saved answers.", href: `/quizzes/${activeAttempt.quiz.id}/play?mode=${activeAttempt.testMode.toLowerCase()}`, action: "Resume your session" }
    : dueCount > 0 ? { kicker: "A little recall goes a long way", title: `${dueCount} ${dueCount === 1 ? "memory" : "memories"} to revisit.`, description: "These flashcards are new or due for review. Give them a moment before moving on.", href: "/study/review", action: "Begin a review" }
    : weak ? { kicker: "Turn uncertainty into understanding", title: weak.quiz.title, description: `Your latest attempt left ${weak.totalQuestions - weak.score} ${weak.totalQuestions - weak.score === 1 ? "question" : "questions"} to revisit. Start with the explanations.`, href: `/quizzes/${weak.quiz.id}/results?attempt=${weak.id}`, action: "Review your mistakes" }
    : recent[0] ? { kicker: "Pick up a thread", title: recent[0].title, description: "Your most recently updated material is ready when you are.", href: recent[0].href, action: "Continue learning" }
    : { kicker: "Every idea starts somewhere", title: "A fresh page for your next idea.", description: "Bring a lecture, a chapter, or a few notes. We’ll help you turn them into something that stays.", href: "/notes/import", action: "Bring your first material" };
  return <PageShell>
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="eyebrow">Your personal study desk</p><h1 className="mt-3 font-display text-3xl tracking-tight sm:text-4xl">Room to think{user.name ? `, ${user.name.split(" ")[0]}` : ""}.</h1></div>
      <Link href="/progress" className="journal-link">Your learning so far <ArrowUpRight className="h-4 w-4" /></Link>
    </header>
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_19rem] xl:gap-16">
      <div className="min-w-0">
        <section className="relative border-y border-line bg-surface px-5 py-8 sm:px-8 sm:py-10" aria-labelledby="next-title">
          <div className="flex items-center justify-between gap-3"><p className="index-label">01 / A good next step</p><span className="flex h-9 w-9 items-center justify-center rounded-full border border-line"><Play className="h-3.5 w-3.5 text-accent-dark" /></span></div>
          <p className="mt-7 text-xs font-medium text-accent-dark">{next.kicker}</p><h2 id="next-title" className="mt-3 max-w-xl break-words font-display text-3xl leading-tight tracking-tight sm:text-4xl">{next.title}</h2><p className="mt-4 max-w-lg text-sm leading-relaxed text-ink-soft">{next.description}</p><ButtonLink href={next.href} className="mt-7">{next.action}<ArrowRight className="h-4 w-4" /></ButtonLink>
        </section>
        <section className="mt-10" aria-labelledby="recent-title"><div className="journal-rule"><h2 id="recent-title" className="section-heading">On your desk</h2><Link href="/library" className="journal-link">Open library<ArrowUpRight className="h-4 w-4" /></Link></div>
          {recent.length ? <div className="divide-y divide-line">{recent.slice(0, 5).map(item => <ResourceCard key={item.kind + item.id} href={item.href} kind={item.kind} title={item.title} meta={formatRelativeTime(item.updatedAt)} />)}</div> : <div className="py-10"><p className="font-display text-xl">A library grows one idea at a time.</p><p className="mt-3 max-w-md text-sm leading-relaxed text-ink-soft">As you bring in material and build study guides, your recent work will be here.</p><Link href="/notes/import" className="journal-link mt-4"><Plus className="h-4 w-4" />Add a source note</Link></div>}
        </section>
      </div>
      <aside className="space-y-9">
        <section><p className="index-label">02 / Keep it in memory</p><div className="mt-5 flex items-center gap-4"><RotateCcw className="h-5 w-5 text-accent-dark" /><p className="font-display text-2xl">{dueCount > 0 ? `${dueCount} cards to revisit` : "A little breathing room."}</p></div><p className="mt-3 text-sm leading-relaxed text-ink-soft">{dueCount > 0 ? "Return to what is due, at your own pace." : "No cards are due right now. Your next review will appear when it is ready."}</p><Link href="/study" className="journal-link mt-3">Find your practice<ArrowRight className="h-4 w-4" /></Link></section>
        <section className="border-t border-line pt-6"><p className="index-label">Make something of it</p><div className="mt-3">{[
          { href: "/notes/import", label: "Bring your material", icon: FileText },
          { href: "/reviewers?create=1", label: "Build a study guide", icon: Layers3 },
          { href: "/diagrams", label: "Connect ideas visually", icon: Workflow },
          { href: "/quizzes?create=1", label: "Test your understanding", icon: ListChecks },
        ].map(item => <Link key={item.href} href={item.href} className="flex min-h-12 items-center gap-3 text-sm hover:text-accent-dark"><item.icon className="h-4 w-4 text-ink-faint" />{item.label}<ArrowUpRight className="ms-auto h-3.5 w-3.5 text-ink-faint" /></Link>)}</div></section>
        {tags.length > 0 && <section className="border-t border-line pt-6"><p className="index-label">Threads you’re following</p><div className="mt-4 flex flex-wrap gap-2">{tags.map(tag => <Link key={tag.id} href={`/search?q=${encodeURIComponent(tag.name)}`} className="inline-flex min-h-10 items-center rounded-control border border-line px-3 text-xs text-ink-soft hover:border-action"># {tag.name}</Link>)}</div></section>}
        {spaces.length > 0 && <section className="border-t border-line pt-6"><p className="index-label">Your study spaces</p>{spaces.map(space => <Link key={space.id} href={`/books/${space.id}`} className="mt-4 flex items-start gap-3"><BookOpen className="mt-1 h-4 w-4 shrink-0 text-book" /><span><span className="block font-display text-lg">{space.title}</span><span className="text-xs text-ink-faint">{space._count.items} pieces of material</span></span></Link>)}</section>}
      </aside>
    </div>
  </PageShell>;
}
