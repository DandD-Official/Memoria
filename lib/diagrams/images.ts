import sharp from "sharp";
import { findMedia } from "@/lib/media/repo";
import type { DiagramDataV2 } from "@/lib/diagrams/schema";
import type { DiagramImages } from "@/lib/diagrams/svg-v2";

/** Only called after diagram authorization, always resolving against its owner. */
export async function resolveDiagramImages(data: DiagramDataV2, ownerId: string): Promise<DiagramImages> {
  const refs = [...new Set(data.nodes.flatMap(node => node.imageRef ? [node.imageRef] : []))];
  const images: DiagramImages = {}; const budget = Math.floor(650_000 / Math.max(1, data.nodes.filter(node => node.imageRef).length));
  for (const ref of refs) {
    const media = await findMedia(ref.slice(8), ownerId);
    if (!media) throw new Error("A diagram image is missing or is not owned by the diagram owner.");
    let width = 1024; let bytes: Buffer;
    do { bytes = await sharp(Buffer.from(media.data), { limitInputPixels: 25_000_000 }).rotate().resize({ width, height: width, fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer(); width = Math.floor(width * .7); } while (bytes.length > budget && width >= 32);
    if (bytes.length > budget) throw new Error("Too many diagram images to create a readable preview. Split this diagram.");
    images[ref] = `data:image/webp;base64,${bytes.toString("base64")}`;
  }
  return images;
}
