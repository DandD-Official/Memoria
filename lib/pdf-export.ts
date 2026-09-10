import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
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
import { createBookWordBlob, createMarkdownWordBlob, downloadBlob } from "@/lib/word-export";
import { CODE_THEMES, getStoredCodeTheme, type CodeTheme } from "@/lib/mmd/code-themes";
import { tokeniseCodeLine, type CodeTokenKind } from "@/lib/mmd/code-highlight";
import { renderMathFormula } from "@/lib/mmd/math";

const PAGE_MARGIN = 48;
const LINE_HEIGHT = 16;
const BRAND_ORANGE: [number, number, number] = [242, 170, 54];
const BRAND_INK: [number, number, number] = [27, 31, 59];
const BRAND_SLOGAN = "Turn scattered notes into structured knowledge.";

function drawBrandHeader(doc: jsPDF, pageWidth: number): number {
  const iconX = PAGE_MARGIN;
  const iconY = 34;
  const iconWidth = 24;
  const iconHeight = 28;

  // Draw the same open-book/bookmark mark used by the Memoria app icon.
  doc.setDrawColor(...BRAND_ORANGE);
  doc.setLineWidth(1.8);
  doc.roundedRect(iconX + 3, iconY, iconWidth - 3, iconHeight, 2, 2, "S");
  doc.line(iconX + 3, iconY + 19, iconX + iconWidth, iconY + 19);
  doc.line(iconX + 10, iconY, iconX + 10, iconY + 11);
  doc.line(iconX + 10, iconY + 11, iconX + 15, iconY + 7);
  doc.line(iconX + 15, iconY + 7, iconX + 20, iconY + 11);

  doc.setTextColor(...BRAND_INK);
  doc.setFont("times", "bold");
  doc.setFontSize(17);
  doc.text("Memoria", iconX + 36, iconY + 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(82, 87, 112);
  doc.text(BRAND_SLOGAN, iconX + 36, iconY + 26);

  doc.setDrawColor(222, 218, 207);
  doc.setLineWidth(0.7);
  doc.line(PAGE_MARGIN, iconY + iconHeight + 13, pageWidth - PAGE_MARGIN, iconY + iconHeight + 13);
  return iconY + iconHeight + 38;
}

/** Native jsPDF renderer used by the downloadable PDF export. */
export interface MarkdownPdfOptions {
  bookCover?: { subtitle?: string | null; description?: string | null; author?: string | null };
  onProgress?: ExportProgressHandler;
}

export function buildMarkdownPdf(title: string, markdown: string, options: MarkdownPdfOptions = {}): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - PAGE_MARGIN * 2;
  let y = PAGE_MARGIN;

  function startPage() {
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, pageHeight, "F");
    doc.setTextColor(20, 24, 39);
  }

  function ensureSpace(needed: number) {
    if (y + needed > pageHeight - PAGE_MARGIN) {
      doc.addPage();
      startPage();
      y = PAGE_MARGIN;
    }
  }

  function stripInlineMarkdown(text: string): string {
    return text
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/\*(.+?)\*/g, "$1")
      .replace(/`(.+?)`/g, "$1")
      .replace(/\[(.+?)\]\(.+?\)/g, "$1");
  }

  function writeParagraph(text: string, fontSize: number, style: "normal" | "bold" | "italic" = "normal", indent = 0) {
    doc.setFont("helvetica", style);
    doc.setFontSize(fontSize);
    doc.setTextColor(20, 24, 39);
    const lines: string[] = doc.splitTextToSize(stripInlineMarkdown(text), contentWidth - indent);
    const blockHeight = lines.length * fontSize * 1.35;
    if (blockHeight <= pageHeight - PAGE_MARGIN * 2) ensureSpace(blockHeight);
    for (const line of lines) {
      ensureSpace(LINE_HEIGHT);
      doc.text(line, PAGE_MARGIN + indent, y);
      y += fontSize * 1.35;
    }
  }

  const lines = markdown.split("\n");
  let tableBuffer: string[][] | null = null;

  function estimatedLineHeight(rawLine: string): number {
    const line = rawLine.trimEnd();
    if (!line.trim()) return 6;
    let size = 11;
    let indent = 0;
    if (line.startsWith("# ")) size = 18;
    else if (line.startsWith("## ")) size = 15;
    else if (line.startsWith("### ")) size = 13;
    else if (line.startsWith("#### ")) size = 12;
    else if (line.startsWith("> ")) indent = 16;
    else if (/^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line)) indent = 12;
    const text = line.replace(/^#{1,4}\s+/, "").replace(/^>\s+/, "");
    const wrapped = doc.splitTextToSize(stripInlineMarkdown(text), contentWidth - indent) as string[];
    return Math.max(1, wrapped.length) * size * 1.35;
  }

  function flushTable(baseIndent: number) {
    if (!tableBuffer || tableBuffer.length === 0) return;
    const [header, , ...rows] = tableBuffer; // row 1 is the "---|---" divider
    ensureSpace(60);
    autoTable(doc, {
      startY: y,
      margin: { left: PAGE_MARGIN + baseIndent, right: PAGE_MARGIN },
      head: [header],
      body: rows,
      styles: { fontSize: 9, cellPadding: 5, fillColor: false, textColor: [20, 24, 39], lineColor: [138, 143, 168], lineWidth: 0.25 },
      headStyles: { fillColor: false, textColor: [20, 24, 39], lineColor: [138, 143, 168], lineWidth: 0.5, fontStyle: "bold" },
      didDrawPage: () => {
        y = PAGE_MARGIN;
      },
    });
    // @ts-expect-error jspdf-autotable augments doc with lastAutoTable at runtime
    y = doc.lastAutoTable.finalY + 16;
    tableBuffer = null;
  }

  /**
   * Renders one contiguous run of ORDINARY Markdown (a single
   * MmdTextNode's content — see lib/mmd/parser.ts). This is exactly the
   * original buildMarkdownPdf line-scanning logic, just parameterized by
   * `indent` so text nested inside an MMD block (see renderMmdNode below)
   * shifts right instead of resetting to the page margin. Byte-for-byte
   * the same behavior as before MMD existed when called once for the
   * whole document with indent 0, which is exactly what happens for any
   * document containing zero ":::" fences.
   */
  function renderMarkdownLines(text: string, indent: number) {
    const textLines = text.split("\n");
    tableBuffer = null;

    for (let index = 0; index < textLines.length; index += 1) {
      const rawLine = textLines[index];
      const line = rawLine.trimEnd();

      // Keep ordinary lesson sections together when they fit on one page,
      // so headings and the last bullet do not become isolated page orphans.
      if (/^#{1,4}\s+/.test(line)) {
        let sectionHeight = 0;
        for (let next = index; next < textLines.length; next += 1) {
          if (next > index && /^#{1,4}\s+/.test(textLines[next])) break;
          if (/^\|.*\|$/.test(textLines[next].trim())) break;
          sectionHeight += estimatedLineHeight(textLines[next]);
        }
        if (sectionHeight <= pageHeight - PAGE_MARGIN * 2) ensureSpace(sectionHeight);
      }

      if (/^\|.*\|$/.test(line.trim())) {
        const cells = line.trim().slice(1, -1).split("|").map((c) => c.trim());
        if (!tableBuffer) tableBuffer = [];
        tableBuffer.push(cells);
        continue;
      } else if (tableBuffer) {
        flushTable(indent);
      }

      if (!line.trim()) {
        y += 6;
        continue;
      }

      if (line.startsWith("# ")) writeParagraph(line.slice(2), 18, "bold", indent);
      else if (line.startsWith("## ")) writeParagraph(line.slice(3), 15, "bold", indent);
      else if (line.startsWith("### ")) writeParagraph(line.slice(4), 13, "bold", indent);
      else if (line.startsWith("#### ")) writeParagraph(line.slice(5), 12, "bold", indent);
      else if (line.startsWith("> ")) writeParagraph(line.slice(2), 11, "italic", indent + 16);
      else if (/^[-*]\s+/.test(line)) writeParagraph(`•  ${line.replace(/^[-*]\s+/, "")}`, 11, "normal", indent + 12);
      else if (/^\d+\.\s+/.test(line)) writeParagraph(line, 11, "normal", indent + 12);
      else writeParagraph(line, 11, "normal", indent);
    }
    flushTable(indent);
  }

  const MAX_INDENT = 60; // caps runaway indentation from deeply nested blocks

  const PDF_CODE_COLORS: Record<CodeTokenKind, keyof CodeTheme> = {
    plain: "foreground", comment: "comment", string: "string", keyword: "keyword",
    number: "number", function: "function", type: "type", operator: "operator",
  };

  function hexRgb(hex: string): [number, number, number] {
    const value = hex.replace("#", "");
    return [Number.parseInt(value.slice(0, 2), 16), Number.parseInt(value.slice(2, 4), 16), Number.parseInt(value.slice(4, 6), 16)];
  }

  function codeSource(node: Extract<MmdNode, { type: "block" }>): string {
    return node.children.filter((child): child is Extract<MmdNode, { type: "markdown" }> => child.type === "markdown").map((child) => child.content).join("\n").replace(/^\n/, "").replace(/\n$/, "");
  }

  function expandCodeTabs(line: string): string {
    return line.replace(/\t/g, "    ");
  }

  function renderCodeBlock(node: Extract<MmdNode, { type: "block" }>, indent: number) {
    const language = node.attrs.language || "text";
    const theme = CODE_THEMES[node.attrs.theme as keyof typeof CODE_THEMES] ?? CODE_THEMES[getStoredCodeTheme()];
    const lines = codeSource(node).split("\n");
    const lineHeight = 13;
    const headerHeight = node.attrs.title || node.attrs.language ? 18 : 0;
    const boxHeight = Math.max(36, headerHeight + lines.length * lineHeight + 14);
    ensureSpace(boxHeight + 12);
    const x = PAGE_MARGIN + indent;
    const width = contentWidth - indent;
    doc.setFillColor(...hexRgb(theme.background));
    doc.roundedRect(x, y - 10, width, boxHeight, 5, 5, "F");
    if (headerHeight) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...hexRgb(theme.foreground));
      doc.text(node.attrs.title || "Code", x + 10, y + 2);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...hexRgb(theme.gutter));
      doc.text(language.toUpperCase(), x + width - 10, y + 2, { align: "right" });
      y += headerHeight;
    }
    lines.forEach((line, lineIndex) => {
      const lineY = y + lineIndex * lineHeight;
      doc.setFont("courier", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...hexRgb(theme.gutter));
      doc.text(String(lineIndex + 1).padStart(3, " "), x + 9, lineY);
      let cursorX = x + 38;
      for (const token of tokeniseCodeLine(expandCodeTabs(line), language)) {
        doc.setTextColor(...hexRgb(theme[PDF_CODE_COLORS[token.kind]]));
        doc.text(token.value, cursorX, lineY);
        cursorX += doc.getTextWidth(token.value);
      }
    });
    y += boxHeight + 12;
  }

  /**
   * Renders one MMD node (see lib/mmd/ast.ts) at the given nesting depth.
   * Plain text passes straight through to renderMarkdownLines; blocks get
   * a bold label line (see lib/mmd/export-helpers.ts) and their children
   * indented one step further; anything the parser couldn't validate
   * (MmdErrorNode) still prints its raw source rather than being dropped,
   * per .context/mmd-spec.md §7 — export must never lose content the
   * in-app preview still shows.
   */
  function renderMmdNode(node: MmdNode, depth: number) {
    const indent = Math.min(depth * 14, MAX_INDENT);

    if (node.type === "markdown") {
      renderMarkdownLines(node.content, indent);
      return;
    }

    if (node.type === "mmd-error") {
      writeParagraph(getUnsupportedBlockText(node.reason), 9, "italic", indent);
      writeParagraph(node.raw, 8, "normal", indent + 8);
      y += 6;
      return;
    }

    // node.type === "block"
    switch (node.block) {
      case "code":
        renderCodeBlock(node, indent);
        return;
      case "section": {
        const { title, subtitle } = getSectionHeading(node);
        y += 6;
        writeParagraph(title, 16, "bold", indent);
        if (subtitle) writeParagraph(subtitle, 10, "italic", indent);
        y += 4;
        for (const child of node.children) renderMmdNode(child, depth);
        y += 6;
        return;
      }
      case "columns": {
        // Side-by-side layout has no faithful single-pass PDF equivalent
        // with independent per-column wrapping/pagination, so columns
        // stack sequentially in export — an explicit, documented v1
        // simplification (mmd-spec.md's print-fallback guidance applied
        // to columns), not an oversight.
        const columnBlocks = node.children.filter(isBlockNode);
        columnBlocks.forEach((column, i) => {
          for (const child of column.children) renderMmdNode(child, depth + 1);
          if (i < columnBlocks.length - 1) {
            y += 4;
            doc.setDrawColor(210, 210, 210);
            doc.line(PAGE_MARGIN + indent, y, pageWidth - PAGE_MARGIN, y);
            y += 8;
          }
        });
        return;
      }
      case "column": {
        for (const child of node.children) renderMmdNode(child, depth);
        return;
      }
      case "diagram":
        writeParagraph(getDiagramPlaceholderText(node), 10, "italic", indent);
        y += 4;
        return;
      case "image":
        writeParagraph(getImagePlaceholderText(node), 10, "italic", indent);
        y += 4;
        return;
      case "gallery":
        for (const child of node.children) renderMmdNode(child, depth);
        return;
      case "image-request":
        writeParagraph(getImageRequestPlaceholderText(node), 10, "italic", indent);
        y += 4;
        return;
      case "svg":
        writeParagraph(getSvgPlaceholderText(node), 10, "italic", indent);
        y += 4;
        return;
      case "math":
        writeParagraph(renderMathFormula(node.attrs.formula), 12, "normal", indent);
        y += 4;
        return;
      default: {
        const label = getBlockLabel(node);
        if (label) {
          writeParagraph(label, isCalloutBlock(node.block) ? 11 : 10, "bold", indent);
          y += 2;
        }
        for (const child of node.children) renderMmdNode(child, indent === MAX_INDENT ? depth : depth + 1);
        if (label) y += 6;
        return;
      }
    }
  }

  startPage();
  if (options.bookCover) {
    doc.setFillColor(61, 45, 39);
    doc.rect(0, 0, pageWidth, pageHeight, "F");
    doc.setDrawColor(184, 105, 77);
    doc.setLineWidth(2);
    doc.roundedRect(34, 34, pageWidth - 68, pageHeight - 68, 8, 8, "S");
    doc.setTextColor(242, 224, 199);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("MEMORIA BOOK", PAGE_MARGIN, 100);
    doc.setDrawColor(184, 105, 77);
    doc.line(PAGE_MARGIN, 122, PAGE_MARGIN + 52, 122);
    doc.setFont("times", "bold");
    doc.setFontSize(34);
    const coverTitle = doc.splitTextToSize(stripInlineMarkdown(title), contentWidth - 40) as string[];
    doc.text(coverTitle, PAGE_MARGIN, 205);
    let coverY = 205 + coverTitle.length * 40;
    if (options.bookCover.subtitle) {
      doc.setFont("times", "italic");
      doc.setFontSize(17);
      doc.setTextColor(218, 190, 164);
      const subtitleLines = doc.splitTextToSize(stripInlineMarkdown(options.bookCover.subtitle), contentWidth - 70) as string[];
      doc.text(subtitleLines, PAGE_MARGIN, coverY + 20);
      coverY += subtitleLines.length * 22 + 28;
    }
    if (options.bookCover.description) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(220, 207, 193);
      doc.text(doc.splitTextToSize(stripInlineMarkdown(options.bookCover.description), contentWidth - 90), PAGE_MARGIN, coverY + 24);
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(218, 190, 164);
    doc.text(`Curated by ${options.bookCover.author?.trim() || "a Memoria reader"}`, PAGE_MARGIN, pageHeight - 92);
    doc.text("Made with Memoria", pageWidth - PAGE_MARGIN, pageHeight - 92, { align: "right" });
    doc.addPage();
    startPage();
  }
  y = drawBrandHeader(doc, pageWidth);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(stripInlineMarkdown(title), PAGE_MARGIN, y);
  y += 30;

  const mmdDocument = parseMmd(markdown);
  for (const node of mmdDocument.children) renderMmdNode(node, 0);

  const totalPages = doc.getNumberOfPages();
  for (let page = options.bookCover ? 2 : 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(90, 90, 90);
    doc.text(`Made with Memoria  |  ${title}`, PAGE_MARGIN, pageHeight - 20);
    doc.text(`Page ${page} of ${totalPages}`, pageWidth - PAGE_MARGIN, pageHeight - 20, { align: "right" });
  }

  return doc;
}

async function convertWordBlobToPdf(title: string, wordBlob: Blob, onProgress?: ExportProgressHandler) {
  onProgress?.({ phase: "preparing", message: "Preparing the Word source document…" });
  const response = await fetch("/api/exports/word-to-pdf", {
    method: "POST",
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "X-Memoria-Filename": sanitizeFilename(title),
    },
    body: wordBlob,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(error?.error ?? "Could not convert the Word document to PDF.");
  }
  onProgress?.({ phase: "creating", message: "Converting the Word document to PDF…" });
  await downloadBlob(await response.blob(), title, "pdf");
}

export async function exportMarkdownToPdf(title: string, markdown: string, onProgress?: ExportProgressHandler) {
  await convertWordBlobToPdf(title, await createMarkdownWordBlob(title, markdown), onProgress);
}

export async function exportBookToPdf(title: string, markdown: string, cover: NonNullable<MarkdownPdfOptions["bookCover"]>, onProgress?: ExportProgressHandler) {
  await convertWordBlobToPdf(title, await createBookWordBlob(title, markdown, cover), onProgress);
}

export interface QuizExportMetadata {
  author?: string | null;
  mode?: string;
  date?: Date;
}

/**
 * Renders a print-first quiz/exam with explicit black text on white pages.
 * Drawing text directly avoids browser theme/CSS and html2canvas visibility
 * bugs that previously produced blank or dark exports.
 */
export function exportQuizToPdf(title: string, questions: QuizQuestion[], metadata: QuizExportMetadata = {}) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - PAGE_MARGIN * 2;
  let y = PAGE_MARGIN;

  function startPage() {
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, pageHeight, "F");
    doc.setTextColor(20, 24, 39);
  }

  function ensureSpace(needed: number) {
    if (y + needed > pageHeight - PAGE_MARGIN) {
      doc.addPage();
      startPage();
      y = PAGE_MARGIN;
    }
  }

  function writeWrapped(
    text: string,
    options: { size?: number; style?: "normal" | "bold" | "italic"; indent?: number; gapAfter?: number } = {}
  ) {
    const size = options.size ?? 11;
    const indent = options.indent ?? 0;
    const lineHeight = size * 1.35;
    doc.setFont("helvetica", options.style ?? "normal");
    doc.setFontSize(size);
    doc.setTextColor(20, 24, 39);
    const lines = doc.splitTextToSize(text || " ", contentWidth - indent) as string[];
    for (const line of lines) {
      ensureSpace(lineHeight);
      doc.text(line, PAGE_MARGIN + indent, y);
      y += lineHeight;
    }
    y += options.gapAfter ?? 0;
  }

  function questionOptions(question: QuizQuestion): string[] {
    if (question.type === "multiple_choice" || question.type === "multiple_select") {
      return question.choices.map((choice, index) => `${String.fromCharCode(65 + index)}. ${choice}`);
    }
    if (question.type === "true_false") return ["A. True", "B. False"];
    if (question.type === "matching") return question.pairs.map((pair, index) => `${index + 1}. ${pair.left}  ____________________`);
    return ["Answer: ________________________________________________"];
  }

  startPage();

  // 1. Header
  y = drawBrandHeader(doc, pageWidth);
  writeWrapped(title, { size: 22, style: "bold", gapAfter: 8 });

  const exportDate = (metadata.date ?? new Date()).toLocaleDateString();
  const mode = metadata.mode ? metadata.mode.replace(/_/g, " ") : "Quiz / Exam";
  writeWrapped(`Date: ${exportDate}    |    Questions: ${questions.length}    |    Type: ${mode}`, { size: 9, gapAfter: 3 });
  writeWrapped(`Author: ${metadata.author?.trim() || "Memoria user"}`, { size: 9, gapAfter: 10 });
  doc.setDrawColor(190, 190, 190);
  doc.line(PAGE_MARGIN, y, pageWidth - PAGE_MARGIN, y);
  y += 22;

  // 2. Questions
  writeWrapped("QUESTIONS", { size: 14, style: "bold", gapAfter: 12 });

  questions.forEach((q, i) => {
    ensureSpace(54);
    writeWrapped(`${i + 1}. ${q.question}`, { size: 11, style: "bold", gapAfter: 5 });
    for (const option of questionOptions(q)) {
      writeWrapped(option, { size: 10, indent: 18, gapAfter: 2 });
    }
    y += 10;
  });

  // 3. Answer key at the end
  doc.addPage();
  startPage();
  y = PAGE_MARGIN;
  writeWrapped("ANSWER KEY", { size: 16, style: "bold", gapAfter: 14 });

  questions.forEach((q, i) => {
    ensureSpace(58);
    writeWrapped(`${i + 1}. ${q.question}`, { size: 11, style: "bold", gapAfter: 4 });
    writeWrapped(`Correct Answer: ${formatCorrectAnswer(q)}`, { size: 10, gapAfter: 3 });
    writeWrapped(`Explanation: ${q.explanation?.trim() || "No detailed explanation was provided."}`, {
      size: 10,
      style: "italic",
      gapAfter: 12,
    });
  });

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(90, 90, 90);
    doc.text(`Made with Memoria  |  ${title}`, PAGE_MARGIN, pageHeight - 20);
    doc.text(`Page ${page} of ${totalPages}`, pageWidth - PAGE_MARGIN, pageHeight - 20, { align: "right" });
  }

  doc.save(`${sanitizeFilename(title)}.pdf`);
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase() || "memoria-export";
}
