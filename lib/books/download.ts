import type { BookDocument } from "@/lib/books/document";
import { renderBook } from "@/lib/books/render";
import { prepareEditablePages, createEditablePagesWord, createEditablePagesPdf } from "@/lib/export/editable-pages";
import { downloadBlob } from "@/lib/word-export";
import type { ExportProgressHandler } from "@/lib/export/types";

export async function downloadBook(book: BookDocument, format: "pdf" | "docx", onProgress?: ExportProgressHandler) {
  const rendered = await renderBook(book);
  try {
    const pages = await prepareEditablePages(rendered.pages, onProgress);
    const word = await createEditablePagesWord(book.title, pages, book.author);
    onProgress?.({ phase: "creating", message: "Creating your document?" });
    const blob = format === "docx" ? word : await createEditablePagesPdf(book.title, pages, word);
    await downloadBlob(blob, book.title, format);
  } finally { rendered.cleanup(); }
}
