import type { BookDocument } from "@/lib/books/document";
import { renderBook } from "@/lib/books/render";
import { captureCanonicalPages } from "@/lib/export/capture-page";
import { dataUrlToBytes } from "@/lib/export/export-pipeline";
import { safeBookExportName } from "@/lib/book-export";
import type { ExportProgressHandler } from "@/lib/export/types";

export async function downloadBook(book: BookDocument, format: "pdf" | "docx", onProgress?: ExportProgressHandler) {
  onProgress?.({ phase: "preparing", message: "Preparing the same pages as your book preview…" });
  const rendered = await renderBook(book);
  try {
    const pages = await captureCanonicalPages(rendered.pages, (current, total) => onProgress?.({ phase: "capturing", current, total, message: `Rendering page ${current} of ${total}…` }));
    onProgress?.({ phase: "creating", message: `Creating ${format.toUpperCase()}…` });
    let blob: Blob;
    if (format === "pdf") {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ unit: "pt", format: [pages[0].width * .75, pages[0].height * .75], compress: true });
      pages.forEach((page, index) => {
        if (index) pdf.addPage([page.width * .75, page.height * .75], "portrait");
        pdf.addImage(page.dataUrl, "PNG", 0, 0, page.width * .75, page.height * .75);
        for (const row of page.element.querySelectorAll<HTMLElement>("[data-book-toc-row]")) {
          const box = row.getBoundingClientRect(); const parent = page.element.getBoundingClientRect();
          pdf.link((box.x - parent.x) * .75, (box.y - parent.y) * .75, box.width * .75, box.height * .75, { pageNumber: rendered.chapterPages[row.dataset.bookTocRow!] });
        }
      });
      pdf.setProperties({ title: book.title, author: book.author, creator: "Memoria" });
      blob = pdf.output("blob");
    } else {
      const { Document, ImageRun, Packer, Paragraph, SectionType } = await import("docx");
      const document = new Document({ title: book.title, creator: "Memoria", description: "A visual edition matching the Memoria book preview.", sections: pages.map(page => ({
        properties: { type: SectionType.NEXT_PAGE, page: { size: { width: Math.round(page.width * 15), height: Math.round(page.height * 15) }, margin: { top: 0, bottom: 0, left: 0, right: 0, header: 0, footer: 0 } } },
        children: [new Paragraph({ spacing: { before: 0, after: 0, line: 1 }, children: [new ImageRun({ type: "png", data: dataUrlToBytes(page.dataUrl), transformation: { width: page.width, height: page.height }, floating: { horizontalPosition: { relative: "page", offset: 0 }, verticalPosition: { relative: "page", offset: 0 }, behindDocument: true, allowOverlap: true } })] })],
      })) });
      blob = await Packer.toBlob(document);
    }
    const url = URL.createObjectURL(blob); const link = document.createElement("a");
    link.href = url; link.download = `${safeBookExportName(book.title)}.${format}`; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } finally { rendered.cleanup(); }
}
