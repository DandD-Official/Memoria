import type { MmdBlockNode } from "@/lib/mmd/ast";

/**
 * Text-only helpers shared by lib/pdf-export.ts and lib/word-export.ts so
 * the two exporters can't drift on wording for the same block. Each
 * exporter still applies its own visual treatment (jsPDF direct drawing
 * vs. docx OOXML Paragraph/TextRun) — this file only decides WHAT text
 * to show, never HOW.
 *
 * Scope note: neither exporter currently embeds real image/diagram bytes
 * (see .context/milestones.md, Export Support). Both runs entirely
 * client-side per the existing buildMarkdownPdf/buildMarkdownWord doc
 * comments; fetching external image URLs into the PDF/DOCX is a real,
 * separately-scoped feature (async, changes both functions' signatures)
 * rather than something to bolt on silently here. Until then, every
 * image/diagram/image-request block exports as a clearly labeled
 * placeholder line — never a broken image, never a fabricated one.
 */

const CALLOUT_LABELS: Record<string, string> = {
  note: "Note",
  tip: "Tip",
  warning: "Warning",
  danger: "Danger",
  info: "Info",
  success: "Success",
};

const CALLOUT_NAMES = new Set(Object.keys(CALLOUT_LABELS));

export function isCalloutBlock(name: string): boolean {
  return CALLOUT_NAMES.has(name);
}

/** The bold label line shown above a block's body in both exporters.
 * Empty string means "no label line" (e.g. section, columns/column,
 * which are purely structural). */
export function getBlockLabel(node: MmdBlockNode): string {
  switch (node.block) {
    case "note":
    case "tip":
    case "warning":
    case "danger":
    case "info":
    case "success":
      return node.attrs.title || CALLOUT_LABELS[node.block];
    case "definition":
      return `Definition: ${node.attrs.term}`;
    case "key-concept":
      return "Key Concept";
    case "example":
      return node.attrs.title || "Example";
    case "important":
      return "Important";
    case "summary":
      return "Summary";
    case "math":
      return `Math: ${node.attrs.formula}`;
    case "card":
      return node.attrs.title || "";
    case "details":
      return `${node.attrs.title || "Details"}  (expandable in-app)`;
    default:
      return "";
  }
}

export function getSectionHeading(node: MmdBlockNode): { title: string; subtitle?: string } {
  return { title: node.attrs.title, subtitle: node.attrs.subtitle };
}

export function getDiagramPlaceholderText(node: MmdBlockNode): string {
  const caption = node.attrs.caption ? ` — ${node.attrs.caption}` : "";
  return `[Diagram not available in export: ${node.attrs.id}${caption}]`;
}

export function getImageRequestPlaceholderText(node: MmdBlockNode): string {
  return `[Image pending — ${node.attrs.purpose}]`;
}

export function getSvgPlaceholderText(node: MmdBlockNode): string {
  const caption = node.attrs.caption ? ` (${node.attrs.caption})` : "";
  return `[SVG visual not included in export: ${node.attrs.alt}${caption}]`;
}

export function getImagePlaceholderText(node: MmdBlockNode): string {
  const caption = node.attrs.caption ? ` (${node.attrs.caption})` : "";
  return `[Image not included in export: ${node.attrs.alt}${caption}]`;
}

export function getUnsupportedBlockText(reason: string): string {
  return `[Unsupported content: ${reason}]`;
}
