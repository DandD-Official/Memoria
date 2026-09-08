import { AlignmentType, BorderStyle, Document, Footer, HeadingLevel, ImageRun, Packer, PageBreak, PageNumber, Paragraph, ShadingType, TextRun } from "docx";
import type { QuizQuestion } from "@/lib/validation/quiz";
import { formatCorrectAnswer } from "@/lib/quiz-grading";
import { parseMmd } from "@/lib/mmd/parser";
import { isBlockNode, type MmdNode } from "@/lib/mmd/ast";
import {
  getBlockLabel,
  getDiagramPlaceholderText,
  getImagePlaceholderText,
  getImageRequestPlaceholderText,
  getSectionHeading,
  getUnsupportedBlockText,
  isCalloutBlock,
} from "@/lib/mmd/export-helpers";

const PAGE_MARGIN = 960;
const FONT = "Arial";
const BRAND_SLOGAN = "Turn scattered notes into structured knowledge.";
const BRAND_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><g fill="none" stroke="#f2aa36" stroke-linecap="round" stroke-linejoin="round" stroke-width="4"><path d="M22 14h27v38H23a8 8 0 0 1-8-8V22a8 8 0 0 1 7-7.94"/><path d="M15 44a8 8 0 0 1 8-8h26"/><path d="M29 14v15l6-5 6 5V14"/></g></svg>`;
const BRAND_LOGO_PNG = "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAQKADAAQAAAABAAAAQAAAAABGUUKwAAADvklEQVR4Ae2aT0gUURzHf2/WLCiULQhDPUQdMi+Vu+uhoHPRH61Y/wQds1uXgsBLh+iQhREd0nOmDpQGQafo3GpZgl2sQ2QlXnSlUFd3fv2eOcybCXX37XN2Rt/AML/f+zvfz/zmvTdvF0AfmoAmoAloApqAJqAJaAKagCawFQkwVaLf3oaSozXxC4zBeQbsJLVbqartHNqZQMu6Wt48/DqHsq4iJS5P0pk1Y+cQ2WPGWLVkE4VWq2KG0U2N5N2/UWDPLN0f7wQwXhZRvC2hyjbyuRYUAWkz3knhfj2fDoNWVhrAtJlopAHEIx4ziPAEGPaMT+NIrO39oih41kyg6JclU2uOQeuV9+aLbedqSwHgAx69Ow9cnSD+XMpmT+1u/TDqSg+4IwXg2KHYJXp0+x1tuJDFpdO7W0dCJZ7fv9wgaLCzjngAROyONo98EtPCYssBQKh3CWTw1OWHyJEDAFAhapybz4yJfphsqTGA5vydosiKK6N/RD9fO90Xa6aFzH1ej1Z0N2hF15dvG7LlZSNAtj9vPZY2Y3dIfC9l8KVzJbd5GtlrTpHehmR9qQiQ7cxbb9aMPyedjd50BkY75R32pm+EX+QI+F+8I3KtPKdUoVaRAYi3j5M0AtDp7xEIAAj4cTELCX5y208EAQCAA3PzCyf2tAx95ye3KRIG/ILgMwD85RKGcLcsOXRRnEa5zdOA8lxlwVPXnSnt+Q3gGj1dgoCTNN+3lDWl2unOXV+IK0qQ5/EyvOxKHaqr/pCaa72foet91qq/7X8tqrgPnyNgo1DIt7vlAShbCQ531W07WB5pYAY20OruOAPcR9dS+WfjT00lAPj2mIHYQVviB5wlvNTw4o9qoRclACIAL4DUh/HQY4Dap8Z3hbELLOxZiMyP7U2O/Vbbvrs17zTozs3NU/IKrHT1IwtwJto07OtaPjeZq5dSBAAzy+KTQ6ESz7EoGQN42EdDKF4ZAP7Orx5kwc5REgF8wAu2zNXvThIA/QK4SQ5JAGxK1L89u6NW9MNkSwGgbas3LpEGu+zyQ+TIAbDYoKiRfihpmzbjR8S0sNhSAL6ks4M09X11RLLSCLBXYYQgBYD/8cFi7KYDYNmqpI+id+n+2KN0b139lFm7y5MfSLegT7gZM3GPCHpBFE2ozNacVATYCh9+Tt2yADpsP4zXgiLAFuxsiDDaECnaMUERUJ1v7wVFgN1ZNJkaGJ+xaiwLkjRFPqNV0jfays7Y+T5cl/8o6UM/ugtNQBPQBDQBTUAT0AQ0gU1D4C9NDxyykT0tXgAAAABJRU5ErkJggg==";

function decodeBase64(value: string) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

function brandHeader() {
  return [
    new Paragraph({
      spacing: { after: 20 },
      children: [
        new ImageRun({
          type: "svg",
          data: new TextEncoder().encode(BRAND_LOGO_SVG),
          transformation: { width: 28, height: 28 },
          fallback: { type: "png", data: decodeBase64(BRAND_LOGO_PNG) },
          altText: { title: "Memoria logo", description: "Memoria book and bookmark logo", name: "Memoria logo" },
        }),
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

function baseDocument(title: string, children: Paragraph[]) {
  return new Document({
    creator: "Memoria",
    title,
    styles: { default: { document: { run: { font: FONT, size: 22, color: "141827" }, paragraph: { spacing: { after: 140, line: 300 } } } } },
    sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: PAGE_MARGIN, right: PAGE_MARGIN, bottom: PAGE_MARGIN, left: PAGE_MARGIN } } }, footers: { default: footer(title) }, children }],
  });
}

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
  const blob = await Packer.toBlob(document);
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement("a");
  anchor.href = url; anchor.download = `${sanitize(filename)}.docx`; anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function buildMarkdownWord(title: string, markdown: string) {
  return baseDocument(title, markdownParagraphs(title, markdown));
}

export async function exportMarkdownToWord(title: string, markdown: string) {
  await downloadDocument(buildMarkdownWord(title, markdown), title);
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

export async function exportBookToWord(title: string, markdown: string, metadata: BookWordMetadata = {}) {
  await downloadDocument(buildBookWord(title, markdown, metadata), title);
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
