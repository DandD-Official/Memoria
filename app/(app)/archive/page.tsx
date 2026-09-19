import Link from "next/link";
import { Archive, FileText, Layers, ListChecks } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { cn, formatRelativeTime } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { ResourceActions } from "@/components/library/resource-actions";

type Filter = "all" | "notes" | "reviewers" | "quizzes";

const filters: Array<{ value: Filter; label: string }> = [
  { value: "all", label: "All" },
  { value: "notes", label: "Notes" },
  { value: "reviewers", label: "Reviewers" },
  { value: "quizzes", label: "Quizzes" },
];

export default async function ArchivePage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const user = await requireUser();
  const requested = (await searchParams).type;
  const filter: Filter = filters.some(({ value }) => value === requested) ? requested as Filter : "all";
  const [notes, reviewers, quizzes] = await Promise.all([
    filter === "all" || filter === "notes" ? prisma.note.findMany({ where: { ownerId: user.id, archivedAt: { not: null } }, orderBy: { archivedAt: "desc" }, select: { id: true, title: true, archivedAt: true, isFavorite: true } }) : [],
    filter === "all" || filter === "reviewers" ? prisma.reviewer.findMany({ where: { ownerId: user.id, archivedAt: { not: null } }, orderBy: { archivedAt: "desc" }, select: { id: true, title: true, archivedAt: true, isFavorite: true } }) : [],
    filter === "all" || filter === "quizzes" ? prisma.quiz.findMany({ where: { ownerId: user.id, archivedAt: { not: null } }, orderBy: { archivedAt: "desc" }, select: { id: true, title: true, archivedAt: true, isFavorite: true } }) : [],
  ]);
  const rows = [
    ...notes.map((item) => ({ ...item, type: "NOTE" as const, label: "Note", href: `/notes/${item.id}`, icon: FileText })),
    ...reviewers.map((item) => ({ ...item, type: "REVIEWER" as const, label: "Reviewer", href: `/reviewers/${item.id}`, icon: Layers })),
    ...quizzes.map((item) => ({ ...item, type: "QUIZ" as const, label: "Quiz", href: `/quizzes/${item.id}`, icon: ListChecks })),
  ].sort((a, b) => (b.archivedAt?.getTime() ?? 0) - (a.archivedAt?.getTime() ?? 0));

  return <div className="mx-auto max-w-5xl space-y-8">
    <div>
      <p className="section-kicker">Keep the workspace clear</p>
      <h1 className="mt-2 font-display text-3xl font-medium text-ink">Archive</h1>
      <p className="mt-1 text-sm text-ink-soft">Archived notes, reviewers, and quizzes in one place.</p>
    </div>
    <nav className="flex flex-wrap gap-2" aria-label="Filter archived resources">
      {filters.map(({ value, label }) => <Link key={value} href={value === "all" ? "/archive" : `/archive?type=${value}`} className={cn("inline-flex min-h-10 items-center rounded-control border px-3 text-sm font-medium", filter === value ? "border-action bg-action text-action-foreground" : "border-line bg-surface text-ink-soft hover:text-ink")}>{label}</Link>)}
    </nav>
    {rows.length === 0 ? <EmptyState icon={Archive} title="Nothing archived" description="Items you archive will appear here and can be restored at any time." /> : <div className="space-y-3">
      {rows.map((row) => <article key={`${row.type}-${row.id}`} className="card flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center">
        <Link href={row.href} className="flex min-w-0 items-center gap-3">
          <span className="rounded-lg bg-ink/5 p-2 text-ink-soft"><row.icon className="h-4 w-4" /></span>
          <span className="min-w-0"><span className="block truncate font-medium text-ink">{row.title}</span><span className="block text-xs text-ink-faint">{row.label} · Archived {row.archivedAt ? formatRelativeTime(row.archivedAt) : "recently"}</span></span>
        </Link>
        <ResourceActions resourceType={row.type} resourceId={row.id} archived favorite={row.isFavorite} />
      </article>)}
    </div>}
  </div>;
}
