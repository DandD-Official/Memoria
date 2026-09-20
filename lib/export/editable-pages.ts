import { toPng } from "html-to-image";
import { Bookmark, Document, ImageRun, InternalHyperlink, Packer, Paragraph, SectionType, Textbox, TextRun, ExternalHyperlink } from "docx";
import JSZip from "jszip";
import type { CanonicalPage, ExportProgressHandler } from "./types";
import { dataUrlToBytes } from "./export-pipeline";

export interface PageText {
  text: string; x: number; y: number; width: number; height: number;
  font: string; size: number; color: string; bold: boolean; italic: boolean; underline: boolean; href?: string;
  targetPage?: number;
}
export interface EditablePage { width: number; height: number; background: string; text: PageText[] }

function resolvedFont(families: string, context: CanvasRenderingContext2D | null) {
  const candidates = families.split(",").map(font => font.trim().replace(/["']/g, ""));
  if (!context) return candidates[0];
  const sample = "mmmmmmmmWWWWiiii012345";
  context.font = "16px monospace";
  const fallbackWidth = context.measureText(sample).width;
  for (const font of candidates) {
    context.font = `16px "${font}", monospace`;
    if (context.measureText(sample).width !== fallbackWidth) return font;
  }
  return /mono/i.test(families) ? "Consolas" : "Arial";
}

function hexColor(color: string) {
  const channels = color.match(/[\d.]+/g)?.slice(0, 3).map(Number) ?? [34, 49, 43];
  return channels.map(value => Math.round(value).toString(16).padStart(2, "0")).join("");
}

/** Measure actual browser line breaks before separating text from the artwork. */
export function measurePageText(element: HTMLElement): PageText[] {
  const origin = element.getBoundingClientRect();
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const output: PageText[] = [];
  const canvas = document.createElement("canvas").getContext("2d");
  const fonts = new Map<string, string>();
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const parent = node.parentElement;
    if (!parent || parent.closest("svg, style, script")) continue;
    const style = getComputedStyle(parent);
    if (style.visibility === "hidden" || style.display === "none") continue;
    const text = node.textContent ?? "";
    if (!fonts.has(style.fontFamily)) fonts.set(style.fontFamily, resolvedFont(style.fontFamily, canvas));
    const range = document.createRange();
    let fragment: PageText | undefined;
    for (let index = 0; index < text.length;) {
      const character = String.fromCodePoint(text.codePointAt(index)!);
      range.setStart(node, index); range.setEnd(node, index + character.length); index += character.length;
      const box = range.getBoundingClientRect();
      if (!box.width || !box.height) continue;
      if (!fragment || Math.abs(fragment.y - (box.y - origin.y)) > 1) {
        fragment = { text: "", x: box.x - origin.x, y: box.y - origin.y, width: 0, height: box.height,
          font: fonts.get(style.fontFamily)!, size: parseFloat(style.fontSize), color: hexColor(style.color),
          bold: Number(style.fontWeight) >= 600 || style.fontWeight === "bold", italic: style.fontStyle === "italic",
          underline: style.textDecorationLine.includes("underline"), href: parent.closest("a")?.getAttribute("href") ?? undefined,
          targetPage: parent.closest("a[data-book-goto]") ? Number(parent.closest("[data-book-toc-row]")?.querySelector("[data-book-page-for]")?.textContent) || undefined : undefined };
        output.push(fragment);
      }
      fragment.text += character;
      fragment.width = Math.max(fragment.width, box.right - origin.x - fragment.x);
    }
  }
  return output;
}

/** Only the artwork is rasterized. All ordinary document text is stored separately. */
export async function prepareEditablePages(pages: CanonicalPage[], onProgress?: ExportProgressHandler): Promise<EditablePage[]> {
  const prepared: EditablePage[] = [];
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:-100000px;top:0;pointer-events:none";
  host.inert = true; document.body.append(host);
  try {
    for (const [index, page] of pages.entries()) {
      onProgress?.({ phase: "preparing", current: index + 1, total: pages.length, message: `Preparing editable page ${index + 1} of ${pages.length}…` });
      const element = page.element.cloneNode(true) as HTMLElement;
      element.style.width = `${page.width}px`; host.append(element);
      await document.fonts.ready;
      await Promise.all(Array.from(element.querySelectorAll("img")).map(img => img.decode()));
      const text = measurePageText(element);
      // text-fill hides glyphs without changing currentColor borders/icons or layout.
      const sheet = document.createElement("style");
      sheet.textContent = ".editable-artwork, .editable-artwork *:not(svg):not(svg *) { -webkit-text-fill-color: transparent !important; text-shadow: none !important; text-decoration-color: transparent !important; } .editable-artwork li::marker { -webkit-text-fill-color: currentColor !important; }";
      element.append(sheet); element.classList.add("editable-artwork");
      const background = await toPng(element, { pixelRatio: 2, cacheBust: false, skipAutoScale: true });
      prepared.push({ width: page.width, height: page.height, background, text });
      element.remove();
    }
    return prepared;
  } finally { host.remove(); }
}

/** Positioned native Word text retains the preview's line breaks and page geometry. */
export async function createEditablePagesWord(title: string, pages: EditablePage[], author = "Memoria") {
  const doc = new Document({ title, creator: author,
    styles: { default: { document: { paragraph: { spacing: { before: 0, after: 0 } } } } },
    sections: pages.map((page, index) => ({
      properties: { type: SectionType.NEXT_PAGE, page: { size: { width: Math.round(page.width * 15), height: Math.round(page.height * 15) }, margin: { top: 0, bottom: 0, left: 0, right: 0, header: 0, footer: 0 } } },
      children: [new Paragraph({ spacing: { before: 0, after: 0, line: 1 }, children: [new Bookmark({ id: `page_${index + 1}`, children: [] }), new ImageRun({ type: "png", data: dataUrlToBytes(page.background), transformation: { width: page.width, height: page.height }, floating: { horizontalPosition: { relative: "page", offset: 0 }, verticalPosition: { relative: "page", offset: 0 }, behindDocument: true, allowOverlap: true } })] }),
        ...page.text.map(item => {
          const run = new TextRun({ text: item.text, font: item.font, size: Math.round(item.size * 1.5), color: item.color, bold: item.bold, italics: item.italic, underline: item.underline ? {} : undefined });
          const children = item.targetPage ? [new InternalHyperlink({ anchor: `page_${item.targetPage}`, children: [run] })] : item.href && /^https?:\/\//i.test(item.href) ? [new ExternalHyperlink({ link: item.href, children: [run] })] : [run];
          return new Textbox({ spacing: { before: 0, after: 0, line: 1 }, style: { position: "absolute", left: `${item.x * .75}pt`, top: `${item.y * .75}pt`, width: `${(item.width + 2) * .75}pt`, height: `${item.height * .75}pt`, positionHorizontalRelative: "page", positionVerticalRelative: "page", wrapStyle: "none", zIndex: 1 }, children: [new Paragraph({ spacing: { before: 0, after: 0 }, children })] });
        }),
      ],
    })),
  });
  // Word's default textbox inset/border would shift the measured text.
  const zip = await JSZip.loadAsync(await Packer.toArrayBuffer(doc));
  const xml = await zip.file("word/document.xml")!.async("string");
  zip.file("word/document.xml", xml.replace(/<v:shape /g, '<v:shape filled="f" stroked="f" ').replace(/<v:textbox[^>]*>/g, '<v:textbox inset="0,0,0,0" style="mso-fit-shape-to-text:t;">'));
  return zip.generateAsync({ type: "blob", compression: "DEFLATE", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
}

export async function createEditablePagesPdf(title: string, pages: EditablePage[], word: Blob) {
  // Word conversion uses the same fonts and text placements as the editable file.
  let response: Response | undefined;
  try { response = await fetch("/api/exports/word-to-pdf", { method: "POST", headers: { "Content-Type": word.type, "X-Memoria-Filename": title.replace(/[^a-z0-9-_]+/gi, "-") }, body: word }); }
  catch { /* Offline deployments use selectable native PDF text below. */ }
  if (response?.ok) return response.blob();
  if (response && response.status < 500) throw new Error("Could not export PDF. Please sign in again and retry.");
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "pt", format: [pages[0].width * .75, pages[0].height * .75], compress: true });
  for (const [index, page] of pages.entries()) {
    if (index) pdf.addPage([page.width * .75, page.height * .75]);
    pdf.addImage(page.background, "PNG", 0, 0, page.width * .75, page.height * .75);
    for (const item of page.text) {
      const family = /mono|consolas|courier/i.test(item.font) ? "courier" : /georgia|palatino|iowan|antiqua|serif/i.test(item.font) ? "times" : "helvetica";
      pdf.setFont(family, item.bold ? item.italic ? "bolditalic" : "bold" : item.italic ? "italic" : "normal");
      pdf.setFontSize(item.size * .75); pdf.setTextColor(`#${item.color}`);
      const naturalWidth = pdf.getTextWidth(item.text);
      pdf.text(item.text, item.x * .75, (item.y + item.height * .8) * .75, { horizontalScale: naturalWidth ? item.width * .75 / naturalWidth : 1 });
      if (item.href && /^https?:\/\//i.test(item.href)) pdf.link(item.x * .75, item.y * .75, item.width * .75, item.height * .75, { url: item.href });
      if (item.targetPage) pdf.link(item.x * .75, item.y * .75, item.width * .75, item.height * .75, { pageNumber: item.targetPage });
      if (item.underline) { pdf.setDrawColor(`#${item.color}`); pdf.setLineWidth(.5); pdf.line(item.x * .75, (item.y + item.height) * .75, (item.x + item.width) * .75, (item.y + item.height) * .75); }
    }
  }
  pdf.setProperties({ title, creator: "Memoria" });
  return pdf.output("blob");
}
