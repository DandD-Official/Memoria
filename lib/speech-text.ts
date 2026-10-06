import { parseMmd } from "@/lib/mmd/parser";
import type { MmdNode } from "@/lib/mmd/ast";

const visualBlocks = new Set(["svg", "diagram", "image", "image-request", "gallery", "video", "audio"]);

function nodeText(node: MmdNode): string {
  if (node.type === "markdown") return node.content;
  if (node.type === "mmd-error") return node.raw;
  if (visualBlocks.has(node.block)) return node.attrs.caption ?? "";
  const label = node.attrs.title ?? node.attrs.term ?? node.attrs.formula ?? "";
  return [label, ...node.children.map(nodeText)].join("\n\n");
}

/** Read the note's words, keeping MMD labels and leaving visual source out. */
export function speechText(content: string): string {
  return parseMmd(content).children.map(nodeText).join("\n\n")
    .replace(/<svg\b[\s\S]*?<\/svg\s*>/gi, "")
    .replace(/^\s*```[^\n]*\n|^\s*```\s*$/gm, "")
    .replace(/^\s*:::[^\n]*$/gm, "")
    .replace(/!\[[^\]]*\]\([^\n]*?\)/g, "")
    .replace(/\[([^\]]+)\]\([^\n]*?\)/g, "$1")
    .replace(/\[([^\]]+)\]\[[^\]]*\]/g, "$1")
    .replace(/^\s*\[[^\]]+\]:\s+.*$/gm, "")
    .replace(/<https?:\/\/[^>]+>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/^\s*\|?\s*:?-{3,}[-\s|:]*$/gm, "")
    .replace(/^\s*(?:#{1,6}\s+|>\s*|[-+*]\s+|\d+[.)]\s+)/gm, "")
    .replace(/\[([ xX])\]\s*/g, "")
    .replace(/(?:\*{1,3}|_{1,3}|~~|`)/g, "")
    .replace(/\|/g, ", ")
    .replace(/&(?:amp|lt|gt|quot|apos|nbsp);/g, entity => ({ "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'", "&nbsp;": " " })[entity] ?? entity)
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n\n")
    .trim();
}

/** Short utterances avoid browser limits on long notes; never split a word unless necessary. */
export function speechChunks(text: string, limit = 180): string[] {
  if (!Number.isInteger(limit) || limit < 2) throw new Error("Speech chunk limit must be at least 2.");
  const chunks: string[] = [];
  let current = "";
  for (const word of text.trim().split(/\s+/).filter(Boolean)) {
    if (current && current.length + word.length + 1 > limit) { chunks.push(current); current = ""; }
    let remaining = word;
    while (remaining.length > limit) {
      // Keep surrogate pairs (for example emoji) intact at a hard split.
      let end = limit;
      if (/[\uD800-\uDBFF]/.test(remaining[end - 1])) end--;
      chunks.push(remaining.slice(0, end)); remaining = remaining.slice(end);
    }
    current = current ? current + " " + remaining : remaining;
    if (/[.!?。！？]$/.test(current)) { chunks.push(current); current = ""; }
  }
  if (current) chunks.push(current);
  return chunks;
}
