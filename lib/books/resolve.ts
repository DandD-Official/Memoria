import { collectionBookDocument, type BookDocument } from "@/lib/books/document";
import type { PublicCollection } from "@/lib/share-collections-repo";
import { parseMmd } from "@/lib/mmd/parser";
import type { MmdNode } from "@/lib/mmd/ast";
import { findDiagramById } from "@/lib/diagrams/repo";
import { diagramToSvg } from "@/lib/diagrams/svg";
import { findMedia } from "@/lib/media/repo";

/** Call only after book access checks. Share only assets owned by the book's
 * owner and explicitly embedded in its chapters; never resolve arbitrary IDs. */
export async function resolveBookDocument(collection: PublicCollection, ownerId: string): Promise<BookDocument> {
  const book = collectionBookDocument(collection);
  const references = new Set<string>();
  function visit(nodes: MmdNode[]) {
    for (const node of nodes) if (node.type === "block") {
      if (node.block === "diagram") references.add(`diagram://${node.attrs.id}`);
      if (node.block === "image" && node.attrs.src.startsWith("media://")) references.add(node.attrs.src);
      visit(node.children);
    }
  }
  book.chapters.forEach(chapter => visit(parseMmd(chapter.content).children));
  const assets: Record<string, string | null> = {};
  // Bounded batches prevent a large book from exhausting the database pool.
  const refs = [...references];
  for (let i = 0; i < refs.length; i += 8) await Promise.all(refs.slice(i, i + 8).map(async ref => {
    assets[ref] = null;
    if (ref.startsWith("diagram://")) {
      const diagram = await findDiagramById(ref.slice(10));
      if (diagram?.ownerId === ownerId) assets[ref] = `data:image/svg+xml;base64,${Buffer.from(diagramToSvg(diagram.data)).toString("base64")}`;
    } else {
      const media = await findMedia(ref.slice(8), ownerId);
      if (media) assets[ref] = `data:${media.mimeType};base64,${media.data.toString("base64")}`;
    }
  }));
  return { ...book, assets };
}
