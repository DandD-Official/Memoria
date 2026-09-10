import { AlignmentType, BorderStyle, Document, ExternalHyperlink, Footer, HeadingLevel, ImageRun, Packer, PageBreak, PageNumber, Paragraph, ShadingType, Table, TableCell, TableLayoutType, TableRow, TextRun, WidthType } from "docx";
import type { QuizQuestion } from "@/lib/validation/quiz";
import { formatCorrectAnswer } from "@/lib/quiz-grading";
import { parseMmd } from "@/lib/mmd/parser";
import { isBlockNode, type MmdNode } from "@/lib/mmd/ast";
import {
  getBlockLabel,
  getDiagramPlaceholderText,
  getImagePlaceholderText,
  getImageRequestPlaceholderText,
  getSvgPlaceholderText,
  getSectionHeading,
  getUnsupportedBlockText,
  isCalloutBlock,
} from "@/lib/mmd/export-helpers";
import type { ExportProgressHandler } from "@/lib/export/types";
import { sanitizeSvgMarkup } from "@/lib/svg/sanitize";
import { renderMathFormula } from "@/lib/mmd/math";
import { CODE_THEMES, getStoredCodeTheme, type CodeTheme, type CodeThemeId } from "@/lib/mmd/code-themes";
import { tokeniseCodeLine, type CodeTokenKind } from "@/lib/mmd/code-highlight";

const PAGE_MARGIN = 960;
const FONT = "Arial";
const BRAND_SLOGAN = "Turn scattered notes into structured knowledge.";
function decodeBase64(value: string) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

function brandHeader() {
  return [
    new Paragraph({
      spacing: { after: 20 },
      children: [
        new TextRun({ text: "▣  ", bold: true, size: 34, color: "F2AA36" }),
        new TextRun({ text: "  Memoria", bold: true, size: 34, color: "1B1F3B", font: "Georgia" }),
      ],
    }),
    new Paragraph({
      spacing: { after: 300 },
      children: [new TextRun({ text: BRAND_SLOGAN, size: 18, color: "525770" })],
    }),
  ];
}

function footer(title: string) {
  return new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Made with Memoria  |  ${title}  |  `, size: 16, color: "666666" }), new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "666666" })] })] });
}

type WordContent = Paragraph | Table;

function baseDocument(title: string, children: WordContent[]) {
  return new Document({
    creator: "Memoria",
    title,
    styles: { default: { document: { run: { font: FONT, size: 22, color: "141827" }, paragraph: { spacing: { after: 140, line: 300 } } } } },
    sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: PAGE_MARGIN, right: PAGE_MARGIN, bottom: PAGE_MARGIN, left: PAGE_MARGIN } } }, footers: { default: footer(title) }, children }],
  });
}

/** Legacy compatibility renderer retained for synchronous callers/tests. */
function cleanInline(text: string) {
  return text.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1").replace(/`(.+?)`/g, "$1").replace(/\[(.+?)\]\(.+?\)/g, "$1");
}

function markdownLines(text: string, indent: number): Paragraph[] {
  const rows: Paragraph[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trimEnd();
    if (!line) {
      rows.push(new Paragraph({}));
      continue;
    }
    const heading = line.match(/^(#{1,4})\s+(.+)/);
    const indentProps = indent > 0 ? { indent: { left: indent } } : {};
    if (heading) {
      const levels = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4];
      rows.push(
        new Paragraph({
          heading: levels[heading[1].length - 1],
          keepNext: true,
          ...indentProps,
          children: [new TextRun({ text: cleanInline(heading[2]), bold: true, color: "1B1F3B" })],
        })
      );
    } else if (/^[-*]\s+/.test(line)) {
      rows.push(
        new Paragraph({
          bullet: { level: 0 },
          ...indentProps,
          children: [new TextRun(cleanInline(line.replace(/^[-*]\s+/, "")))],
        })
      );
    } else if (/^\d+\.\s+/.test(line)) {
      rows.push(new Paragraph({ indent: { left: 240 + indent }, children: [new TextRun(cleanInline(line))] }));
    } else if (line.startsWith("> ")) {
      rows.push(
        new Paragraph({
          indent: { left: 360 + indent },
          children: [new TextRun({ text: cleanInline(line.slice(2)), italics: true, color: "4A4F6A" })],
        })
      );
    } else {
      rows.push(new Paragraph({ ...indentProps, children: [new TextRun(cleanInline(line))] }));
    }
  }
  return rows;
}

const CALLOUT_SHADING = "FBF3E3"; // pale amber, echoes the brand accent color
const CARD_SHADING = "F3F1EC"; // pale neutral

const INDENT_STEP = 280; // twips per nesting level
const MAX_INDENT = 1200;

/**
 * Renders one MMD node (see lib/mmd/ast.ts) into docx Paragraphs at the
 * given nesting depth. Mirrors renderMmdNode in lib/pdf-export.ts —
 * same block-to-label mapping (lib/mmd/export-helpers.ts), same
 * "columns stack sequentially" and "details render expanded" export
 * simplifications, same "never drop content" handling for parse errors.
 */
function renderMmdNode(node: MmdNode, depth: number): Paragraph[] {
  const indent = Math.min(depth * INDENT_STEP, MAX_INDENT);

  if (node.type === "markdown") return markdownLines(node.content, indent);

  if (node.type === "mmd-error") {
    return [
      new Paragraph({
        indent: indent > 0 ? { left: indent } : undefined,
        children: [new TextRun({ text: getUnsupportedBlockText(node.reason), italics: true, color: "8A2E2E" })],
      }),
      new Paragraph({
        indent: { left: indent + 160 },
        children: [new TextRun({ text: node.raw, font: "Courier New", size: 18, color: "4A4F6A" })],
      }),
    ];
  }

  // node.type === "block"
  switch (node.block) {
    case "section": {
      const { title, subtitle } = getSectionHeading(node);
      const rows: Paragraph[] = [
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          keepNext: true,
          indent: indent > 0 ? { left: indent } : undefined,
          children: [new TextRun({ text: title, bold: true, color: "1B1F3B" })],
        }),
      ];
      if (subtitle) {
        rows.push(
          new Paragraph({
            indent: indent > 0 ? { left: indent } : undefined,
            children: [new TextRun({ text: subtitle, italics: true, color: "525770" })],
          })
        );
      }
      for (const child of node.children) rows.push(...renderMmdNode(child, depth));
      return rows;
    }
    case "columns": {
      // Same fallback as the PDF exporter: sequential stacking rather
      // than a real side-by-side layout — see lib/pdf-export.ts's
      // renderMmdNode "columns" case for the full reasoning.
      const rows: Paragraph[] = [];
      const columnBlocks = node.children.filter(isBlockNode);
      columnBlocks.forEach((column, i) => {
        for (const child of column.children) rows.push(...renderMmdNode(child, depth + 1));
        if (i < columnBlocks.length - 1) {
          rows.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "D2D2D2" } }, children: [] }));
        }
      });
      return rows;
    }
    case "column": {
      const rows: Paragraph[] = [];
      for (const child of node.children) rows.push(...renderMmdNode(child, depth));
      return rows;
    }
    case "diagram":
      return [
        new Paragraph({
          indent: indent > 0 ? { left: indent } : undefined,
          children: [new TextRun({ text: getDiagramPlaceholderText(node), italics: true, color: "525770" })],
        }),
      ];
    case "image":
      return [
        new Paragraph({
          indent: indent > 0 ? { left: indent } : undefined,
          children: [new TextRun({ text: getImagePlaceholderText(node), italics: true, color: "525770" })],
        }),
      ];
    case "gallery": {
      const rows: Paragraph[] = [];
      for (const child of node.children) rows.push(...renderMmdNode(child, depth));
      return rows;
    }
    case "image-request":
      return [
        new Paragraph({
          indent: indent > 0 ? { left: indent } : undefined,
          children: [new TextRun({ text: getImageRequestPlaceholderText(node), italics: true, color: "8A6D2E" })],
        }),
      ];
    case "svg":
      return [
        new Paragraph({
          indent: indent > 0 ? { left: indent } : undefined,
          children: [new TextRun({ text: getSvgPlaceholderText(node), italics: true, color: "525770" })],
        }),
      ];
    default: {
      const label = getBlockLabel(node);
      const shading = isCalloutBlock(node.block) || node.block === "card" || node.block === "details" ? CALLOUT_SHADING : undefined;
      const rows: Paragraph[] = [];
      if (label) {
        rows.push(
          new Paragraph({
            indent: indent > 0 ? { left: indent } : undefined,
            shading: shading ? { type: ShadingType.SOLID, color: "auto", fill: shading } : undefined,
            children: [new TextRun({ text: label, bold: true, color: "1B1F3B" })],
          })
        );
      }
      const childDepth = indent === MAX_INDENT ? depth : depth + 1;
      for (const child of node.children) rows.push(...renderMmdNode(child, childDepth));
      return rows;
    }
  }
}

function markdownParagraphs(title: string, markdown: string) {
  const rows: Paragraph[] = [...brandHeader(), new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: title, bold: true, size: 40, color: "1B1F3B" })] })];
  const mmdDocument = parseMmd(markdown);
  for (const node of mmdDocument.children) rows.push(...renderMmdNode(node, 0));
  return rows;
}

async function downloadDocument(document: Document, filename: string) {
  await downloadBlob(await Packer.toBlob(document), filename, "docx");
}

export async function createMarkdownWordBlob(title: string, markdown: string) {
  return Packer.toBlob(await buildEditableMarkdownWord(title, markdown));
}

export async function createBookWordBlob(title: string, markdown: string, metadata: BookWordMetadata = {}) {
  return Packer.toBlob(await buildEditableMarkdownWord(title, markdown, { bookCover: metadata }));
}

export async function downloadBlob(blob: Blob, filename: string, extension: "docx" | "pdf") {
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement("a");
  anchor.href = url; anchor.download = `${sanitize(filename)}.${extension}`; anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** @deprecated Use exportMarkdownToWord for the canonical visual browser export. */
export function buildMarkdownWord(title: string, markdown: string) {
  return baseDocument(title, markdownParagraphs(title, markdown));
}

type WordImageType = "jpg" | "png" | "gif" | "bmp" | "svg";
interface WordImageAsset { type: WordImageType; data: Uint8Array; }
interface EditableWordContext {
  imageCache: Map<string, Promise<WordImageAsset | null>>;
  diagramCache: Map<string, Promise<WordImageAsset | null>>;
  codeTheme: CodeThemeId;
}

const MAX_WORD_IMAGE_BYTES = 10 * 1024 * 1024;

function imageType(contentType: string): WordImageType | null {
  const value = contentType.toLowerCase().split(";", 1)[0].trim();
  if (value === "image/jpeg") return "jpg";
  if (value === "image/png") return "png";
  if (value === "image/gif") return "gif";
  if (value === "image/bmp") return "bmp";
  if (value === "image/svg+xml") return "svg";
  return null;
}

async function fetchWordImage(source: string): Promise<WordImageAsset | null> {
  try {
    const url = new URL(source, window.document.baseURI);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    const sameOrigin = url.origin === window.location.origin;
    const response = await fetch(url.href, {
      cache: "force-cache",
      credentials: sameOrigin ? "include" : "omit",
      mode: sameOrigin ? "same-origin" : "cors",
    });
    if (!response.ok) return null;
    const type = imageType(response.headers.get("content-type") ?? "");
    if (!type) return null;
    const blob = await response.blob();
    if (blob.size > MAX_WORD_IMAGE_BYTES) return null;
    return { type, data: new Uint8Array(await blob.arrayBuffer()) };
  } catch {
    return null;
  }
}

function cachedImage(context: EditableWordContext, source: string): Promise<WordImageAsset | null> {
  const existing = context.imageCache.get(source);
  if (existing) return existing;
  const pending = fetchWordImage(source);
  context.imageCache.set(source, pending);
  return pending;
}

function imageRun(asset: WordImageAsset, alt: string, width: number, height: number): ImageRun {
  if (asset.type === "svg") {
    return new ImageRun({
      type: "svg",
      data: asset.data,
      transformation: { width, height },
      fallback: { type: "png", data: decodeBase64("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=") },
      altText: { title: alt || "SVG visual", description: alt || "SVG visual", name: alt || "SVG visual" },
    });
  }
  return new ImageRun({ type: asset.type, data: asset.data, transformation: { width, height }, altText: { title: alt || "Image", description: alt || "Image", name: alt || "Image" } });
}

function textRun(text: string, options: Record<string, unknown> = {}): TextRun {
  // Keep ordinary exported text readable even when Word inherits a dark
  // document/theme style. Specialized runs (code, links, callouts) override
  // this explicit high-contrast default through `options`.
  return new TextRun({ text, color: "141827", ...options } as ConstructorParameters<typeof TextRun>[0]);
}

async function inlineRuns(value: string, context: EditableWordContext): Promise<Array<TextRun | ExternalHyperlink | ImageRun>> {
  const runs: Array<TextRun | ExternalHyperlink | ImageRun> = [];
  const token = /(!?)\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)|\*\*(.+?)\*\*|__(.+?)__|`([^`]+)`|\*([^*]+?)\*|_([^_]+?)_/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = token.exec(value))) {
    if (match.index > last) runs.push(textRun(value.slice(last, match.index)));
    if (match[1] === "!") {
      const asset = await cachedImage(context, match[3]);
      if (asset) runs.push(imageRun(asset, match[2], 420, 240));
      else runs.push(textRun(`[Image unavailable: ${match[2]}]`, { italics: true, color: "8A2E2E" }));
    } else if (match[3] && match[2]) {
      runs.push(new ExternalHyperlink({ link: match[3], children: [textRun(match[2], { color: "C0801E", underline: {} })] }));
    } else if (match[4] !== undefined || match[5] !== undefined) {
      runs.push(textRun(match[4] ?? match[5] ?? "", { bold: true }));
    } else if (match[6] !== undefined) {
      runs.push(textRun(match[6], { font: "Courier New", shading: { type: ShadingType.SOLID, fill: "F0EEE8" } }));
    } else {
      runs.push(textRun(match[7] ?? "", { italics: true }));
    }
    last = match.index + match[0].length;
  }
  if (last < value.length) runs.push(textRun(value.slice(last)));
  return runs.length ? runs : [textRun("")];
}

function tableCells(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((cell) => cell.trim());
}

function isTableDivider(line: string): boolean {
  return tableCells(line).length > 0 && tableCells(line).every((cell) => /^:?-{3,}:?$/.test(cell));
}

async function wordTable(rows: string[][], context: EditableWordContext): Promise<Table> {
  const columnCount = Math.max(1, ...rows.map((row) => row.length));
  const tableRows = await Promise.all(rows.map(async (row) => new TableRow({
    children: await Promise.all(Array.from({ length: columnCount }, async (_, columnIndex) => new TableCell({
      width: { size: Math.floor(100 / columnCount), type: WidthType.PERCENTAGE },
      children: [new Paragraph({ children: await inlineRuns(row[columnIndex] ?? "", context), spacing: { before: 40, after: 40 } })],
    }))),
  })));
  return new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE }, layout: TableLayoutType.AUTOFIT, borders: { top: { style: BorderStyle.SINGLE, size: 8, color: "8A8FA8" }, bottom: { style: BorderStyle.SINGLE, size: 8, color: "8A8FA8" }, left: { style: BorderStyle.SINGLE, size: 8, color: "8A8FA8" }, right: { style: BorderStyle.SINGLE, size: 8, color: "8A8FA8" }, insideHorizontal: { style: BorderStyle.SINGLE, size: 6, color: "D7D9E1" }, insideVertical: { style: BorderStyle.SINGLE, size: 6, color: "D7D9E1" } } });
}

async function editableMarkdownLines(value: string, indent: number, context: EditableWordContext): Promise<WordContent[]> {
  const lines = value.split(/\r?\n/);
  const output: WordContent[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trimEnd();
    if (line.trim().startsWith("|") && index + 1 < lines.length && isTableDivider(lines[index + 1])) {
      const rows: string[][] = [tableCells(line)];
      index += 2;
      while (index < lines.length && lines[index].trim().startsWith("|")) rows.push(tableCells(lines[index++]));
      index -= 1;
      output.push(await wordTable(rows, context));
      continue;
    }
    if (!line.trim()) { output.push(new Paragraph({ spacing: { after: 80 } })); continue; }
    const heading = line.match(/^(#{1,4})\s+(.+)/);
    const list = line.match(/^\s*([-*]|\d+\.)\s+(.+)/);
    const quote = line.match(/^\s*>\s?(.*)/);
    const paragraphOptions = { indent: indent > 0 ? { left: indent } : undefined, spacing: { after: 120, line: 300 } };
    if (heading) {
      const levels = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4];
      output.push(new Paragraph({ ...paragraphOptions, heading: levels[heading[1].length - 1], keepNext: true, children: await inlineRuns(heading[2], context) }));
    } else if (list) {
      const level = Math.min(Math.floor((line.length - line.trimStart().length) / 2), 3);
      output.push(new Paragraph({ ...paragraphOptions, bullet: /^[-*]/.test(list[1]) ? { level } : undefined, indent: { left: indent + level * 280 }, children: await inlineRuns(list[2], context) }));
    } else if (quote) {
      output.push(new Paragraph({ ...paragraphOptions, indent: { left: indent + 360 }, border: { left: { style: BorderStyle.SINGLE, size: 18, color: "E8A33D" } }, shading: { type: ShadingType.SOLID, fill: "FCF0D9" }, children: await inlineRuns(quote[1], context) }));
    } else if (/^\s*[-*_]{3,}\s*$/.test(line)) {
      output.push(new Paragraph({ ...paragraphOptions, border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: "E4E1D8" } }, children: [] }));
    } else {
      output.push(new Paragraph({ ...paragraphOptions, children: await inlineRuns(line, context) }));
    }
  }
  return output;
}

function svgSource(node: Extract<MmdNode, { type: "block" }>): string {
  return node.children.filter((child): child is Extract<MmdNode, { type: "markdown" }> => child.type === "markdown").map((child) => child.content).join("\n");
}

const WORD_CODE_COLORS: Record<CodeTokenKind, keyof CodeTheme> = {
  plain: "foreground", comment: "comment", string: "string", keyword: "keyword",
  number: "number", function: "function", type: "type", operator: "operator",
};

function codeSource(node: Extract<MmdNode, { type: "block" }>): string {
  return node.children.filter((child): child is Extract<MmdNode, { type: "markdown" }> => child.type === "markdown").map((child) => child.content).join("\n").replace(/^\n/, "").replace(/\n$/, "");
}

function editableCodeParagraphs(node: Extract<MmdNode, { type: "block" }>, context: EditableWordContext): Paragraph[] {
  const language = node.attrs.language || "text";
  const theme = CODE_THEMES[node.attrs.theme as keyof typeof CODE_THEMES] ?? CODE_THEMES[context.codeTheme];
  return codeSource(node).split("\n").map((line, index) => new Paragraph({
    keepLines: true,
    spacing: { before: 0, after: 0, line: 280 },
    shading: { type: ShadingType.SOLID, fill: theme.background },
    children: [
      textRun(`${String(index + 1).padStart(3, " ")}  `, { color: theme.gutter, font: "Courier New", size: 18 }),
      ...tokeniseCodeLine(line, language).map((token) => textRun(token.value, { color: theme[WORD_CODE_COLORS[token.kind]], font: "Courier New", size: 18 })),
    ],
  }));
}

async function assetParagraph(asset: WordImageAsset | null, alt: string, caption: string | undefined, width = 480, height = 300): Promise<Paragraph> {
  const children = asset ? [imageRun(asset, alt, width, height)] : [textRun(`[Image unavailable: ${alt}]`, { italics: true, color: "8A2E2E" })];
  return new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 160, after: caption ? 40 : 180 }, children });
}

async function editableMmdNode(node: MmdNode, depth: number, context: EditableWordContext): Promise<WordContent[]> {
  const indent = Math.min(depth * INDENT_STEP, MAX_INDENT);
  if (node.type === "markdown") return editableMarkdownLines(node.content, indent, context);
  if (node.type === "mmd-error") return [new Paragraph({ children: [textRun(getUnsupportedBlockText(node.reason), { italics: true, color: "8A2E2E" }), textRun(`\n${node.raw}`, { font: "Courier New", color: "4A4F6A" })] })];

  const children = async (childDepth = depth + 1) => (await Promise.all(node.children.map((child) => editableMmdNode(child, childDepth, context)))).flat();
  switch (node.block) {
    case "code": return editableCodeParagraphs(node, context);
    case "section": {
      const result: WordContent[] = [new Paragraph({ heading: HeadingLevel.HEADING_2, keepNext: true, children: [textRun(node.attrs.title, { bold: true, color: "1B1F3B" })] })];
      if (node.attrs.subtitle) result.push(new Paragraph({ children: [textRun(node.attrs.subtitle, { italics: true, color: "525770" })] }));
      result.push(...await children(depth));
      return result;
    }
    case "columns": {
      const columns = node.children.filter(isBlockNode);
      const cells = await Promise.all(columns.map(async (column) => new TableCell({ width: { size: Math.floor(100 / Math.max(1, columns.length)), type: WidthType.PERCENTAGE }, verticalAlign: "top", children: (await Promise.all(column.children.map((child) => editableMmdNode(child, depth + 1, context)))).flat().filter((item): item is Paragraph | Table => item instanceof Paragraph || item instanceof Table) })));
      return [new Table({ rows: [new TableRow({ children: cells })], width: { size: 100, type: WidthType.PERCENTAGE }, layout: TableLayoutType.AUTOFIT, borders: { top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, insideVertical: { style: BorderStyle.SINGLE, size: 6, color: "E4E1D8" } } })];
    }
    case "column": return children(depth);
    case "image": {
      const src = node.attrs.src.startsWith("media://") ? `/api/media/${encodeURIComponent(node.attrs.src.slice("media://".length))}` : node.attrs.src;
      return [await assetParagraph(await cachedImage(context, src), node.attrs.alt, node.attrs.caption)];
    }
    case "gallery": {
      const images = node.children.filter(isBlockNode).filter((child) => child.block === "image");
      const cells = await Promise.all(images.map(async (image) => new TableCell({ width: { size: 33, type: WidthType.PERCENTAGE }, children: [await assetParagraph(await cachedImage(context, image.attrs.src), image.attrs.alt, image.attrs.caption, 180, 130)] })));
      const rows: TableRow[] = [];
      for (let index = 0; index < cells.length; index += 3) rows.push(new TableRow({ children: cells.slice(index, index + 3) }));
      return rows.length ? [new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE }, layout: TableLayoutType.AUTOFIT })] : [];
    }
    case "diagram": {
      const id = encodeURIComponent(node.attrs.id);
      let title = node.attrs.id;
      try { const response = await fetch(`/api/diagrams/${id}`, { credentials: "include" }); const body = response.ok ? await response.json() : null; title = body?.diagram?.title ?? title; } catch { /* preserve visible fallback */ }
      const source = `/api/diagrams/${id}/preview`;
      return [await assetParagraph(await cachedImage(context, source), title, node.attrs.caption)];
    }
    case "svg": {
      const markup = sanitizeSvgMarkup(svgSource(node));
      const asset = markup ? { type: "svg" as const, data: new TextEncoder().encode(markup) } : null;
      return [await assetParagraph(asset, node.attrs.alt, node.attrs.caption)];
    }
    case "math": return [new Paragraph({ alignment: AlignmentType.CENTER, shading: { type: ShadingType.SOLID, fill: "F5F3EE" }, children: [textRun(renderMathFormula(node.attrs.formula), { font: "Courier New", size: 24 })] })];
    case "image-request": return [new Paragraph({ shading: { type: ShadingType.SOLID, fill: "FCF0D9" }, children: [textRun("Visual requested: ", { bold: true, color: "A45C43" }), textRun(node.attrs.purpose), textRun(`\nAlt text: ${node.attrs.alt}`, { color: "766658" }), ...(node.attrs.caption ? [textRun(`\nCaption: ${node.attrs.caption}`, { color: "766658" })] : [])] })];
    case "card": return [new Table({ rows: [new TableRow({ children: [new TableCell({ shading: { type: ShadingType.SOLID, fill: node.attrs.type === "highlight" ? "FCF0D9" : "FFFFFF" }, borders: { top: { style: BorderStyle.SINGLE, size: 8, color: node.attrs.type === "outline" ? "E4E1D8" : "F2AA36" }, bottom: { style: BorderStyle.SINGLE, size: 8, color: "E4E1D8" }, left: { style: BorderStyle.SINGLE, size: 8, color: "E4E1D8" }, right: { style: BorderStyle.SINGLE, size: 8, color: "E4E1D8" } }, children: [ ...(node.attrs.title ? [new Paragraph({ children: [textRun(node.attrs.title, { bold: true, size: 26, color: "1B1F3B" })] })] : []), ...(node.attrs.subtitle ? [new Paragraph({ children: [textRun(node.attrs.subtitle, { italics: true, color: "525770" })] })] : []), ...await children(depth + 1)] })] })] })];
    case "details": return [new Table({ rows: [new TableRow({ children: [new TableCell({ shading: { type: ShadingType.SOLID, fill: "FFFFFF" }, children: [new Paragraph({ children: [textRun(`▾ ${node.attrs.title || "Details"}`, { bold: true, color: "1B1F3B" })] }), ...await children(depth + 1)] })] })] })];
    default: {
      const label = getBlockLabel(node);
      const content: WordContent[] = [];
      if (label) content.push(new Paragraph({ shading: { type: ShadingType.SOLID, fill: CALLOUT_SHADING }, children: [textRun(label, { bold: true, color: "1B1F3B" })] }));
      content.push(...await children());
      return [new Table({ rows: [new TableRow({ children: [new TableCell({ shading: { type: ShadingType.SOLID, fill: isCalloutBlock(node.block) ? CALLOUT_SHADING : "FFFFFF" }, children: content.filter((item): item is Paragraph | Table => item instanceof Paragraph || item instanceof Table) })] })] })];
    }
  }
}

async function buildEditableMarkdownWord(title: string, markdown: string, options: { bookCover?: BookWordMetadata; onProgress?: ExportProgressHandler } = {}) {
  options.onProgress?.({ phase: "preparing", message: "Preparing editable Word document…" });
  const context: EditableWordContext = { imageCache: new Map(), diagramCache: new Map(), codeTheme: getStoredCodeTheme() };
  const children: WordContent[] = [];
  if (options.bookCover) {
    children.push(new Paragraph({ shading: { type: ShadingType.SOLID, fill: "3D2D27" }, spacing: { before: 1000, after: 1800 }, children: [textRun("MEMORIA BOOK", { bold: true, size: 18, color: "F2AA36" })] }));
    children.push(new Paragraph({ shading: { type: ShadingType.SOLID, fill: "3D2D27" }, children: [textRun(title, { bold: true, size: 48, color: "F2E0C7", font: "Georgia" })] }));
    if (options.bookCover.subtitle) children.push(new Paragraph({ shading: { type: ShadingType.SOLID, fill: "3D2D27" }, children: [textRun(options.bookCover.subtitle, { italics: true, size: 28, color: "DABEA4", font: "Georgia" })] }));
    if (options.bookCover.description) children.push(new Paragraph({ spacing: { after: 500 }, children: [textRun(options.bookCover.description, { color: "665B52" })] }));
    children.push(new Paragraph({ children: [textRun(`Curated by ${options.bookCover.author?.trim() || "a Memoria reader"}`, { color: "766658" })] }), new Paragraph({ children: [new PageBreak()] }));
  }
  children.push(...brandHeader(), new Paragraph({ heading: HeadingLevel.TITLE, keepNext: true, children: [textRun(title, { bold: true, size: 40, color: "1B1F3B", font: "Georgia" })] }));
  for (const node of parseMmd(markdown).children) children.push(...await editableMmdNode(node, 0, context));
  options.onProgress?.({ phase: "creating", message: "Creating editable Word document…" });
  return baseDocument(title, children);
}

export async function exportMarkdownToWord(title: string, markdown: string, onProgress?: ExportProgressHandler) {
  await downloadDocument(await buildEditableMarkdownWord(title, markdown, { onProgress }), title);
}

export interface BookWordMetadata { subtitle?: string | null; description?: string | null; author?: string | null }

export function buildBookWord(title: string, markdown: string, metadata: BookWordMetadata = {}) {
  const children: Paragraph[] = [
    new Paragraph({ spacing: { before: 900, after: 160 }, children: [new TextRun({ text: "MEMORIA BOOK", bold: true, size: 18, color: "A45C43", characterSpacing: 80 })] }),
    new Paragraph({ heading: HeadingLevel.TITLE, spacing: { before: 1200, after: 220 }, children: [new TextRun({ text: title, bold: true, size: 64, color: "3D2D27", font: "Georgia" })] }),
  ];
  if (metadata.subtitle) children.push(new Paragraph({ spacing: { after: 360 }, children: [new TextRun({ text: metadata.subtitle, italics: true, size: 32, color: "665348", font: "Georgia" })] }));
  if (metadata.description) children.push(new Paragraph({ spacing: { before: 300, after: 900 }, children: [new TextRun({ text: metadata.description, size: 22, color: "665B52" })] }));
  children.push(new Paragraph({ spacing: { before: 1200 }, children: [new TextRun({ text: `Curated by ${metadata.author?.trim() || "a Memoria reader"}`, size: 18, color: "766658" })] }), new Paragraph({ children: [new PageBreak()] }), ...brandHeader());
  const document = parseMmd(markdown);
  for (const node of document.children) children.push(...renderMmdNode(node, 0));
  return baseDocument(title, children);
}

export async function exportBookToWord(title: string, markdown: string, metadata: BookWordMetadata = {}, onProgress?: ExportProgressHandler) {
  await downloadDocument(await buildEditableMarkdownWord(title, markdown, { bookCover: metadata, onProgress }), title);
}

function options(question: QuizQuestion) {
  if (question.type === "multiple_choice" || question.type === "multiple_select") return question.choices.map((choice, index) => `${String.fromCharCode(65 + index)}. ${choice}`);
  if (question.type === "true_false") return ["A. True", "B. False"];
  if (question.type === "matching") return question.pairs.map((pair, index) => `${index + 1}. ${pair.left}  ____________________`);
  return ["Answer: ________________________________________________"];
}

export async function exportQuizToWord(title: string, questions: QuizQuestion[], metadata: { author?: string | null; mode?: string } = {}) {
  const children: Paragraph[] = [
    ...brandHeader(),
    new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: title, bold: true, size: 40, color: "1B1F3B" })] }),
    new Paragraph({ children: [new TextRun(`${new Date().toLocaleDateString()}  |  ${questions.length} questions  |  ${metadata.mode?.replace(/_/g, " ") ?? "Quiz / Exam"}`)] }),
    new Paragraph({ children: [new TextRun(`Author: ${metadata.author?.trim() || "Memoria user"}`)] }),
    new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "QUESTIONS", bold: true })] }),
  ];
  questions.forEach((question, index) => {
    children.push(new Paragraph({ keepNext: true, children: [new TextRun({ text: `${index + 1}. ${question.question}`, bold: true })] }));
    for (const option of options(question)) children.push(new Paragraph({ indent: { left: 360 }, children: [new TextRun(option)] }));
  });
  children.push(new Paragraph({ children: [new PageBreak()] }), new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "ANSWER KEY", bold: true })] }));
  questions.forEach((question, index) => {
    children.push(new Paragraph({ keepNext: true, children: [new TextRun({ text: `${index + 1}. ${question.question}`, bold: true })] }), new Paragraph({ children: [new TextRun({ text: "Correct Answer: ", bold: true }), new TextRun(formatCorrectAnswer(question))] }), new Paragraph({ children: [new TextRun({ text: "Explanation: ", bold: true }), new TextRun({ text: question.explanation?.trim() || "No detailed explanation was provided.", italics: true })] }));
  });
  await downloadDocument(baseDocument(title, children), title);
}

function sanitize(value: string) { return value.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase() || "memoria-export"; }
