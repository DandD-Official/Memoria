import { Search } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { emptyLibraryResults, searchLibrary } from "@/lib/library-search";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { PageDescription, PageHeader, PageHeaderContent, PageShell, PageTitle } from "@/components/ui/page";
import { ResourceCard } from "@/components/library/resource-card";
import { TagList } from "@/components/library/tag-list";
import { formatRelativeTime } from "@/lib/utils";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const [{ q: rawQuery }, user] = await Promise.all([searchParams, requireUser()]);
  const query = rawQuery?.trim() ?? "";
  const { notes, reviewers, quizzes, diagrams, collections } = query
    ? await searchLibrary(user.id, query, 30)
    : emptyLibraryResults();
  const sections = [
    { label: "Source notes", kind: "note", rows: notes, path: "/notes/" },
    { label: "Study guides", kind: "reviewer", rows: reviewers, path: "/reviewers/" },
    { label: "Quizzes & exams", kind: "quiz", rows: quizzes, path: "/quizzes/" },
    { label: "Diagrams", kind: "diagram", rows: diagrams, path: "/diagrams?open=" },
    { label: "Books & study spaces", kind: "book", rows: collections, path: "/books/" },
  ] as const;
  const total = sections.reduce((count, section) => count + section.rows.length, 0);

  return <PageShell className="max-w-5xl">
    <PageHeader><PageHeaderContent><p className="eyebrow">Find your thread</p><PageTitle className="mt-3">Search your library.</PageTitle><PageDescription>Find a source, a study guide, a diagram, or a space you have put together.</PageDescription></PageHeaderContent></PageHeader>
    <form action="/search" className="max-w-2xl">
      <Label htmlFor="library-query">Title, topic, tag, or filename</Label>
      <div className="flex flex-wrap gap-3"><Input id="library-query" name="q" defaultValue={query} placeholder="e.g. Cell biology" className="min-w-0 flex-1" /><Button type="submit"><Search className="h-4 w-4" aria-hidden="true" />Search</Button></div>
    </form>
    {query && <p className="break-words text-sm text-ink-soft">{total} result{total === 1 ? "" : "s"} for ?{query}?{sections.some(section => section.rows.length === 30) ? " ? Showing up to 30 matches of each kind. Refine your search to find more." : ""}</p>}
    {query && total === 0 ? <EmptyState icon={Search} title="No matching material." description="Try a shorter topic, a different tag, or part of a filename." actionHref="/search" actionLabel="Clear search" /> : sections.map(section => section.rows.length > 0 && <section key={section.kind} aria-labelledby={`results-${section.kind}`}>
      <div className="journal-rule"><h2 id={`results-${section.kind}`} className="section-heading">{section.label}</h2><span className="font-mono text-xs text-ink-faint">{section.rows.length}</span></div>
      <div className="divide-y divide-line">{section.rows.map(row => <ResourceCard key={row.id} href={`${section.path}${row.id}`} kind={section.kind} title={row.title} description={"description" in row ? row.description : undefined} favorite={"isFavorite" in row ? row.isFavorite : false} meta={`Updated ${formatRelativeTime(row.updatedAt)}`}>
        {"tags" in row && <TagList tags={row.tags.map(({ tag }) => tag)} />}
      </ResourceCard>)}</div>
    </section>)}
  </PageShell>;
}
