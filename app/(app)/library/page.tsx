import Link from "next/link";
import { ArrowRight, Plus, Search, BookOpen } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { PageShell, PageHeader, PageHeaderContent, PageTitle, PageDescription, PageActions } from "@/components/ui/page";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ResourceCard, type ResourceKind } from "@/components/library/resource-card";
import { formatRelativeTime } from "@/lib/utils";

export default async function LibraryPage() {
  const user = await requireUser();
  const [notes, reviewers, quizzes, diagrams, tags] = await Promise.all([
    prisma.note.findMany({ where: { ownerId: user.id, archivedAt: null }, orderBy: { updatedAt: "desc" }, take: 8, select: { id: true, title: true, description: true, updatedAt: true, isFavorite: true, _count: { select: { reviewerLinks: true } } } }),
    prisma.reviewer.findMany({ where: { ownerId: user.id, archivedAt: null }, orderBy: { updatedAt: "desc" }, take: 8, select: { id: true, title: true, description: true, updatedAt: true, isFavorite: true, _count: { select: { noteLinks: true, quizLinks: true } } } }),
    prisma.quiz.findMany({ where: { ownerId: user.id, archivedAt: null }, orderBy: { updatedAt: "desc" }, take: 8, select: { id: true, title: true, description: true, updatedAt: true, isFavorite: true, mode: true } }),
    prisma.diagram.findMany({ where: { ownerId: user.id }, orderBy: { updatedAt: "desc" }, take: 8, select: { id: true, title: true, updatedAt: true } }),
    prisma.tag.findMany({ where: { ownerId: user.id }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const resources: { id: string; title: string; description?: string | null; updatedAt: Date; kind: ResourceKind; href: string; isFavorite?: boolean; badge?: string }[] = [
    ...notes.map(item => ({ ...item, kind: "note" as const, href: `/notes/${item.id}`, badge: item._count.reviewerLinks ? `${item._count.reviewerLinks} connected guides` : "Ready to explore" })),
    ...reviewers.map(item => ({ ...item, kind: "reviewer" as const, href: `/reviewers/${item.id}`, badge: `${item._count.noteLinks} sources · ${item._count.quizLinks} quizzes` })),
    ...quizzes.map(item => ({ ...item, kind: "quiz" as const, href: `/quizzes/${item.id}`, badge: item.mode })),
    ...diagrams.map(item => ({ ...item, kind: "diagram" as const, href: `/diagrams?open=${item.id}` })),
  ].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  return <PageShell>
    <PageHeader><PageHeaderContent><p className="eyebrow">A place for your ideas to meet</p><PageTitle className="mt-3">The knowledge library.</PageTitle><PageDescription>Everything you bring in, make sense of, and return to.</PageDescription></PageHeaderContent><PageActions><ButtonLink href="/notes/import"><Plus className="h-4 w-4" />Bring your material</ButtonLink></PageActions></PageHeader>
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_15rem]">
      <section><div className="journal-rule"><h2 className="section-heading">Recently shaped</h2><Link href="/search" className="journal-link"><Search className="h-4 w-4" />Find a thread</Link></div>{resources.length === 0 ? <EmptyState icon={BookOpen} title="Start with something you want to understand." description="Bring in a document or write a note. Connect it to a study guide, a diagram, and a little practice." actionHref="/notes/import" actionLabel="Add your first source" /> : <><div className="divide-y divide-line">{resources.map(item => <ResourceCard key={item.kind + item.id} href={item.href} kind={item.kind} title={item.title} description={item.description} badge={item.badge} favorite={item.isFavorite} meta={formatRelativeTime(item.updatedAt)} />)}</div><p className="mt-5 text-xs text-ink-faint">The latest eight items of each kind. Use the library index to browse every item.</p></>}</section>
      <aside className="space-y-8"><section><p className="index-label">Follow an idea</p><ol className="mt-5 space-y-5">{[["01", "Capture a source", "/notes", "Notes"], ["02", "Find the connections", "/reviewers", "Study guides"], ["03", "Give it a shape", "/diagrams", "Diagrams"], ["04", "Put it into practice", "/quizzes", "Quizzes"]].map(([number, label, href, name]) => <li key={number} className="flex gap-3"><span className="mt-1 font-mono text-xs text-ink-faint">{number}</span><div><p className="text-sm text-ink-soft">{label}</p><Link href={href} className="journal-link">{name}<ArrowRight className="h-3 w-3" /></Link></div></li>)}</ol></section>{tags.length > 0 && <section className="border-t border-line pt-6"><p className="index-label">Your subjects & tags</p><div className="mt-4 flex flex-wrap gap-2">{tags.map(tag => <Link key={tag.id} href={`/search?q=${encodeURIComponent(tag.name)}`} className="inline-flex min-h-10 items-center rounded-control border border-line px-3 text-xs hover:border-action"># {tag.name}</Link>)}</div></section>}<p className="annotation">Keep your go-to material in Favorites. Archive anything you want to set aside without losing it.</p></aside>
    </div>
  </PageShell>;
}
