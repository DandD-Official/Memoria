import { DiagramEditor } from "@/components/diagrams/diagram-editor";
import { findDiagramSummariesByOwner } from "@/lib/diagrams/repo";
import { requireUser } from "@/lib/auth/session";
import { notFound } from "next/navigation";
import { PageDescription, PageHeader, PageHeaderContent, PageShell, PageTitle } from "@/components/ui/page";

export default async function DiagramsPage({ searchParams }: { searchParams: Promise<{ open?: string }> }) {
  const [user, query] = await Promise.all([requireUser(), searchParams]);
  const diagrams = await findDiagramSummariesByOwner(user.id);
  if (query.open && !diagrams.some(diagram => diagram.id === query.open)) notFound();
  return <PageShell className="!max-w-none"><PageHeader className="mb-4 pb-4"><PageHeaderContent><PageTitle className="text-2xl sm:text-3xl">Diagrams</PageTitle><PageDescription>Map the relationships in your material, then bring the diagram into a note or study guide.</PageDescription></PageHeaderContent></PageHeader><DiagramEditor key={query.open ?? "library"} initialDiagramId={query.open} initialDiagrams={diagrams.map((diagram) => ({ id: diagram.id, title: diagram.title, updatedAt: diagram.updatedAt.toISOString() }))} /></PageShell>;
}
