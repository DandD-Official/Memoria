import { prisma } from "@/lib/db";
import type { Diagram as DbDiagram } from "@prisma/client";
import { diagramDataSchema, emptyDiagramData, type DiagramData } from "@/lib/diagrams/schema";

/**
 * The Diagram shape the rest of the app works with — identical to
 * Prisma's generated `Diagram` type except `data` is the typed, validated
 * DiagramData shape rather than raw Prisma `Json`, and `previewImage` is
 * omitted from the default select (it's binary and only needed by the
 * export pipeline / the embed preview, not by list views).
 *
 * Nothing outside this file should call `prisma.diagram` directly — same
 * rule as lib/notes-repo.ts for `prisma.note`, so there's exactly one
 * place that knows `data` needs validating on the way in and out.
 */
export type Diagram = Omit<DbDiagram, "data" | "previewImage"> & { data: DiagramData };
export type DiagramSummary = Pick<DbDiagram, "id" | "ownerId" | "title" | "createdAt" | "updatedAt">;

function hydrate(diagram: DbDiagram): Diagram {
  const parsed = diagramDataSchema.safeParse(diagram.data);
  // A row that fails to parse (e.g. hand-edited in the DB, or written by
  // a future schema version this build doesn't know about yet) must never
  // crash the caller — fall back to an empty, valid diagram rather than
  // throwing, consistent with the MMD parser's own fail-safe philosophy
  // (mmd-spec.md §7). The raw bytes in the DB are untouched either way;
  // this only affects what this read returns.
  const { previewImage: _previewImage, ...rest } = diagram;
  return { ...rest, data: parsed.success ? parsed.data : emptyDiagramData() };
}

export async function createDiagram(params: { ownerId: string; title: string; data?: DiagramData }): Promise<Diagram> {
  const created = await prisma.diagram.create({
    data: {
      ownerId: params.ownerId,
      title: params.title,
      data: params.data ?? emptyDiagramData(),
    },
  });
  return hydrate(created);
}

export async function updateDiagram(id: string, data: { title?: string; data?: DiagramData }): Promise<Diagram> {
  const updated = await prisma.diagram.update({
    where: { id },
    data: { title: data.title, data: data.data },
  });
  return hydrate(updated);
}

export async function findDiagramById(id: string): Promise<Diagram | null> {
  const diagram = await prisma.diagram.findUnique({ where: { id } });
  return diagram ? hydrate(diagram) : null;
}

export async function findDiagramSummariesByOwner(ownerId: string): Promise<DiagramSummary[]> {
  return prisma.diagram.findMany({
    where: { ownerId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, ownerId: true, title: true, createdAt: true, updatedAt: true },
  });
}

/**
 * Creates a new, independent copy with a fresh id — per the project
 * brief's explicit diagram-duplication requirement ("create a new
 * diagram ID, preserve the original, allow the copy to be edited
 * independently, do not accidentally modify the original"). The preview
 * image is intentionally NOT copied — it'll be regenerated the first
 * time the duplicate is saved from the editor, since copying stale bytes
 * forward risks the preview silently drifting from `data` if the
 * duplicate is edited before ever being re-rendered.
 */
export async function duplicateDiagram(id: string, ownerId: string): Promise<Diagram | null> {
  const original = await prisma.diagram.findUnique({ where: { id } });
  if (!original || original.ownerId !== ownerId) return null;
  const copy = await prisma.diagram.create({
    data: {
      ownerId,
      title: `${original.title} (copy)`,
      data: original.data,
    },
  });
  return hydrate(copy);
}

export async function deleteDiagram(id: string): Promise<void> {
  await prisma.diagram.delete({ where: { id } });
}

/** Stores a rendered PNG/SVG snapshot for export embedding and fast
 * inline preview — see .context/diagram-system.md "Export". Separate
 * from updateDiagram() because the snapshot is produced client-side from
 * the live canvas (a re-render step), not part of the structural data. */
export async function updateDiagramPreview(id: string, image: Buffer, mimeType: string): Promise<void> {
  await prisma.diagram.update({ where: { id }, data: { previewImage: image, previewMimeType: mimeType } });
}

export async function findDiagramPreview(id: string): Promise<{ image: Buffer; mimeType: string } | null> {
  const diagram = await prisma.diagram.findUnique({ where: { id }, select: { previewImage: true, previewMimeType: true } });
  if (!diagram?.previewImage || !diagram.previewMimeType) return null;
  return { image: Buffer.from(diagram.previewImage), mimeType: diagram.previewMimeType };
}
