import { DiagramEditor } from "@/components/diagrams/diagram-editor";
import { findDiagramSummariesByOwner } from "@/lib/diagrams/repo";
import { requireUser } from "@/lib/auth/session";

export default async function DiagramsPage() {
  const user = await requireUser();
  const diagrams = await findDiagramSummariesByOwner(user.id);
  return <div><div className="mb-6"><p className="text-sm font-medium text-accent-dark">Visual thinking</p><h1 className="font-display text-3xl text-ink">Diagrams</h1><p className="mt-1 text-sm text-ink-soft">Sketch relationships, processes, and systems alongside your study material.</p></div><DiagramEditor initialDiagrams={diagrams.map((diagram) => ({ id: diagram.id, title: diagram.title, updatedAt: diagram.updatedAt.toISOString() }))} /></div>;
}
