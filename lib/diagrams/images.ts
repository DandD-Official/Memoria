import sharp from "sharp";
import { findMedia } from "@/lib/media/repo";
import { upgradeDiagram, type PersistedDiagramData } from "@/lib/diagrams/schema";
import type { DiagramImages } from "@/lib/diagrams/svg-v2";
import { sanitizeSvgMarkup } from "@/lib/svg/sanitize";

/** Only called after diagram authorization, always resolving against its owner. */
export async function resolveDiagramImages(input: PersistedDiagramData, ownerId: string): Promise<DiagramImages> {
  const data = upgradeDiagram(input);
  const refs = [...new Set(data.nodes.flatMap(node => node.imageRef ? [node.imageRef] : []))];
  const images: DiagramImages = {}; const budget = Math.floor(650_000 / Math.max(1, data.nodes.filter(node => node.imageRef).length));
  for (const ref of refs) {
    const media = await findMedia(ref.slice(8), ownerId);
    if (!media) throw new Error("A diagram image is missing or is not owned by the diagram owner.");
    let input = Buffer.from(media.data);
    if (media.mimeType === "image/svg+xml") {
      const safe = sanitizeSvgMarkup(input.toString("utf8"));
      if (!safe) throw new Error("Diagram SVG image contains unsupported or unsafe markup.");
      input = Buffer.from(safe);
    }
    let width = 1024; let bytes: Buffer;
    do { bytes = await sharp(input, { limitInputPixels: 25_000_000 }).rotate().resize({ width, height: width, fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer(); width = Math.floor(width * .7); } while (bytes.length > budget && width >= 32);
    if (bytes.length > budget) throw new Error("Too many diagram images to create a readable preview. Split this diagram.");
    images[ref] = `data:image/webp;base64,${bytes.toString("base64")}`;
  }
  return images;
}
