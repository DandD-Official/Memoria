import { Layers } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { EmptyState } from "@/components/ui/empty-state";
import { ReviewerWizardLauncher } from "@/components/reviewers/reviewer-wizard-launcher";
import { formatRelativeTime } from "@/lib/utils";
import { LibraryNavigation } from "@/components/library/library-navigation";
import { TagList } from "@/components/library/tag-list";
import { PageActions, PageDescription, PageHeader, PageHeaderContent, PageShell, PageTitle } from "@/components/ui/page";
import { ResourceCard } from "@/components/library/resource-card";

export default async function ReviewersPage(props: { searchParams: Promise<{ create?: string; fromNote?: string; source?: string; page?: string }> }) {
  const searchParams = await props.searchParams;
  const user = await requireUser();
  const page = Math.max(1, Number(searchParams.page) || 1);
  const [reviewers, notes] = await Promise.all([
    prisma.reviewer.findMany({ where: { ownerId: user.id, archivedAt: null }, orderBy: { updatedAt: "desc" }, skip: (page - 1) * 24, take: 24, select: { id: true, title: true, description: true, style: true, updatedAt: true, isFavorite: true, tags: { select: { tag: { select: { id: true, name: true, color: true } } } } } }),
    prisma.note.findMany({ where: { ownerId: user.id, archivedAt: null }, orderBy: { updatedAt: "desc" }, select: { id: true, title: true } }),
  ]);

  return (
    <PageShell className="max-w-5xl">
      <PageHeader>
        <PageHeaderContent>
          <PageTitle>Reviewers</PageTitle>
          <PageDescription>Structured study guides distilled from your Memories.</PageDescription>
        </PageHeaderContent>
        <PageActions>
          <ReviewerWizardLauncher key={`${searchParams.create}-${searchParams.source}-${searchParams.fromNote}`} notes={notes} defaultNoteId={searchParams.fromNote} initiallyOpen={searchParams.create === "1"} initialPath={searchParams.source === "import" ? "import" : searchParams.source === "notes" ? "notes" : undefined} />
        </PageActions>
      </PageHeader>

      <LibraryNavigation basePath="/reviewers" page={page} hasNext={reviewers.length === 24} />

      {reviewers.length === 0 ? (
        <EmptyState icon={Layers} title="Build your first reviewer" description="Turn one or more Memories into a focused study guide." actionLabel={notes.length > 0 ? "Choose existing Memories" : "Import a Memory first"} actionHref={notes.length > 0 ? "/reviewers?create=1&source=notes" : "/notes/import"} secondaryActionLabel="Import reviewer" secondaryActionHref="/reviewers?create=1&source=import" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
