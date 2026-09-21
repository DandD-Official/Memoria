import { Layers } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { EmptyState } from "@/components/ui/empty-state";
import Link from "next/link";
import { ReviewerWizardLauncher } from "@/components/reviewers/reviewer-wizard-launcher";
import { formatRelativeTime } from "@/lib/utils";
import { LibraryNavigation } from "@/components/library/library-navigation";
import { TagList } from "@/components/library/tag-list";
import { PageActions, PageDescription, PageHeader, PageHeaderContent, PageShell, PageTitle } from "@/components/ui/page";
import { ResourceCard } from "@/components/library/resource-card";
import { hasSystemAiConnection } from "@/lib/ai/system";

export default async function ReviewersPage(props: { searchParams: Promise<{ create?: string; fromNote?: string; source?: string; page?: string }> }) {
  const searchParams = await props.searchParams;
  const user = await requireUser();
  const page = Math.max(1, Number(searchParams.page) || 1);
  const [reviewers, notes] = await Promise.all([
    prisma.reviewer.findMany({ where: { ownerId: user.id, archivedAt: null }, orderBy: { updatedAt: "desc" }, skip: (page - 1) * 24, take: 24, select: { id: true, title: true, description: true, style: true, updatedAt: true, isFavorite: true, tags: { select: { tag: { select: { id: true, name: true, color: true } } } } } }),
    prisma.note.findMany({ where: { ownerId: user.id, archivedAt: null }, orderBy: { updatedAt: "desc" }, select: { id: true, title: true } }),
  ]);

  if (searchParams.create === "1" || searchParams.fromNote || searchParams.source) return <PageShell className="max-w-4xl"><Link href="/reviewers" className="mb-4 inline-block text-sm text-ink-soft hover:underline">? Back to study guides</Link><h1 className="mb-6 font-display text-3xl">Create a study guide</h1><ReviewerWizardLauncher key={`${searchParams.create}-${searchParams.source}-${searchParams.fromNote}`} notes={notes} defaultNoteId={searchParams.fromNote} initiallyOpen={searchParams.create === "1"} initialPath={searchParams.source === "import" ? "import" : searchParams.source === "notes" ? "notes" : undefined} systemAvailable={hasSystemAiConnection()} /></PageShell>;

  return (
    <PageShell className="max-w-5xl">
      <PageHeader>
        <PageHeaderContent>
          <p className="eyebrow">Turn information into understanding</p><PageTitle className="mt-3">Study guides</PageTitle>
          <PageDescription>Readable study guides shaped from your notes.</PageDescription>
        </PageHeaderContent>
        <PageActions>
          <ReviewerWizardLauncher key={`${searchParams.create}-${searchParams.source}-${searchParams.fromNote}`} notes={notes} defaultNoteId={searchParams.fromNote} initiallyOpen={searchParams.create === "1"} initialPath={searchParams.source === "import" ? "import" : searchParams.source === "notes" ? "notes" : undefined} systemAvailable={hasSystemAiConnection()} />
        </PageActions>
      </PageHeader>

      <LibraryNavigation basePath="/reviewers" page={page} hasNext={reviewers.length === 24} />

      {reviewers.length === 0 ? (
        <EmptyState icon={Layers} title="Build your first reviewer" description="Turn one or more notes into a focused study guide." actionLabel={notes.length > 0 ? "Choose existing notes" : "Import notes first"} actionHref={notes.length > 0 ? "/reviewers?create=1&source=notes" : "/notes/import"} secondaryActionLabel="Import reviewer" secondaryActionHref="/reviewers?create=1&source=import" />
      ) : (
        <div className="resource-list">
          {reviewers.map((reviewer) => (
            <ResourceCard key={reviewer.id} href={`/reviewers/${reviewer.id}`} kind="reviewer" title={reviewer.title} description={reviewer.description} badge={reviewer.style} meta={formatRelativeTime(reviewer.updatedAt)} favorite={reviewer.isFavorite}>
              <TagList tags={reviewer.tags.map(({ tag }) => tag)} />
            </ResourceCard>
          ))}
        </div>
      )}
    </PageShell>
  );
}
