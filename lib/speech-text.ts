import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import { parseMmd } from "@/lib/mmd/parser";
import type { MmdNode } from "@/lib/mmd/ast";
import { pronounceSymbols } from "@/lib/speech-symbols";

const visualBlocks = new Set(["svg", "diagram", "image", "image-request", "gallery", "video", "audio"]);
const markdownParser = unified().use(remarkParse).use(remarkGfm);

interface MarkdownNode { type: string; value?: string; lang?: string | null; children?: MarkdownNode[] }

function markdownText(node: MarkdownNode): string {
  const children = node.children?.map(markdownText) ?? [];
  switch (node.type) {
    case "image": case "imageReference": case "definition": case "thematicBreak": return "";
    case "html": return (node.value ?? "").replace(/<svg\b[\s\S]*?<\/svg\s*>/gi, "").replace(/<[^>]*>/g, "");
    case "code": return node.lang === "svg" || /^\s*<svg\b/i.test(node.value ?? "") ? "" : node.value ?? "";
    case "text": case "inlineCode": return node.value ?? "";
    case "break": return "\n";
    case "tableRow": return children.join(", ");
    case "table": case "list": case "listItem": return children.filter(Boolean).join("\n");
    case "root": case "blockquote": return children.filter(Boolean).join("\n\n");
    default: return children.join("");
  }
}

function nodeText(node: MmdNode): string {
  if (node.type === "markdown") return markdownText(markdownParser.parse(node.content.replace(/<svg\b[\s\S]*?<\/svg\s*>/gi, "\n")));
  if (node.type === "mmd-error") return markdownText(markdownParser.parse(node.raw.replace(/^\s*:::[^\n]*$/gm, "")));
  if (visualBlocks.has(node.block)) return node.attrs.caption ?? "";
  const label = node.block === "math" ? "\\(" + node.attrs.formula + "\\)" : node.attrs.title ?? node.attrs.term ?? "";
  return [label, ...node.children.map(nodeText)].filter(Boolean).join("\n\n");
}

/** Extract words from the same Markdown grammar as the note, preserving actual operators. */
export function speechText(content: string): string {
  return pronounceSymbols(parseMmd(content).children.map(nodeText).filter(Boolean).join("\n\n"))
    .replace(/\n\s*\n+/g, "\n\n").trim();
}

/** Keep headings and paragraphs separate, and protect names such as "Dr. Chen". */
export function speechSentences(text: string, locale = "en"): string[] {
  const abbreviationDot = "\uE000";
  const segmenter = typeof Intl.Segmenter === "function" ? new Intl.Segmenter(locale, { granularity: "sentence" }) : null;
  return text.split(/\n+/).filter(part => part.trim()).flatMap(paragraph => {
    const protectedText = paragraph
      .replace(/\b(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|vs|e\.g|i\.e)\./gi, value => value.replaceAll(".", abbreviationDot))
      .replace(/\b[A-Z]\.(?=\s+[A-Z][a-z])/g, value => value.replace(".", abbreviationDot));
    const sentences = segmenter
      ? Array.from(segmenter.segment(protectedText), part => part.segment)
      : protectedText.match(/[\s\S]+?(?:[!?。！？]+["'”’)]*|\.+["'”’)]*(?=\s|$)|$)/g) ?? [];
    return sentences.map(sentence => sentence.replaceAll(abbreviationDot, ".").trim()).filter(Boolean);
  });
}

/** Prefer full sentences, then clauses; only very long clauses split at word boundaries. */
export function speechChunks(text: string, limit = 280): string[] {
  if (!Number.isInteger(limit) || limit < 2) throw new Error("Speech chunk limit must be at least 2.");
  const chunks: string[] = [];
  for (const sentence of speechSentences(text)) {
    let current = "";
    const flush = () => { if (current) chunks.push(current); current = ""; };
    for (const clause of sentence.split(/(?<=[,;:])\s+/)) {
      if (current && current.length + clause.length + 1 > limit) flush();
      if (clause.length <= limit) { current = current ? current + " " + clause : clause; continue; }
      for (const word of clause.split(/\s+/).filter(Boolean)) {
        if (current && current.length + word.length + 1 > limit) flush();
        let remaining = word;
        while (remaining.length > limit) {
          let end = limit;
          if (/[\uD800-\uDBFF]/.test(remaining[end - 1])) end--;
          chunks.push(remaining.slice(0, end)); remaining = remaining.slice(end);
        }
        current = current ? current + " " + remaining : remaining;
      }
    }
    flush();
  }
  return chunks;
}
