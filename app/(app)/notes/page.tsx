import { FileText, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { findNoteSummariesByOwner } from "@/lib/notes-repo";
import { EmptyState } from "@/components/ui/empty-state";
import { formatRelativeTime } from "@/lib/utils";
import { LibraryNavigation } from "@/components/library/library-navigation";
import { TagList } from "@/components/library/tag-list";
import { ButtonLink } from "@/components/ui/button";
import { PageActions, PageDescription, PageHeader, PageHeaderContent, PageShell, PageTitle } from "@/components/ui/page";
import { ResourceCard } from "@/components/library/resource-card";
import { GenerateNoteDialog } from "@/components/notes/generate-note-dialog";
import { hasSystemAiConnection } from "@/lib/ai/system";

const sourceLabels: Record<string, string> = {
  PDF: "PDF",
  PPTX: "PowerPoint",
  MARKDOWN: "Markdown",
  TXT: "Text file",
  GOOGLE_DOCS: "Google Docs",
  NOTION: "Notion",
  MANUAL: "Manual",
};

export default async function NotesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const query = await searchParams;
  const user = await requireUser();
  const page = Math.max(1, Number(query.page) || 1);
  const notes = await findNoteSummariesByOwner(user.id, { archived: false, page, pageSize: 24 });

  return (
    <PageShell className="max-w-5xl">
      <PageHeader>
        <PageHeaderContent>
          <p className="eyebrow">The source of your understanding</p><PageTitle className="mt-3">Source notes</PageTitle>
          <PageDescription>Your captured source material, ready to read, shape, and study.</PageDescription>
        </PageHeaderContent>
        <PageActions>
          <GenerateNoteDialog systemAvailable={hasSystemAiConnection()} />
          <ButtonLink href="/notes/import" className="w-full sm:w-auto"><Plus className="h-4 w-4" /> Import notes</ButtonLink>
        </PageActions>
      </PageHeader>

      <LibraryNavigation basePath="/notes" page={page} hasNext={notes.length === 24} />

      {notes.length === 0 ? (
        <EmptyState icon={FileText} title="Your notes start here" description="Import a note or document to create your first study material." actionLabel="Import notes" actionHref="/notes/import" />
      ) : (
        <div className="resource-list">
          {notes.map((note) => (
            <ResourceCard
              key={note.id}
              href={`/notes/${note.id}`}
              kind="note"
              title={note.title}
              badge={sourceLabels[note.sourceType] ?? note.sourceType}
              meta={formatRelativeTime(note.updatedAt)}
              favorite={note.isFavorite}
              description={note.description || note.originalFilename || "Open this note to continue reading."}
            >
              <TagList tags={note.tags.map(({ tag }) => tag)} />
            </ResourceCard>
          ))}
        </div>
      )}
    </PageShell>
  );
}
