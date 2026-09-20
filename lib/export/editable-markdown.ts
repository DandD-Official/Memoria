import { renderCanonicalMmdDocument } from "./canonical";
import { prepareEditablePages, createEditablePagesWord, createEditablePagesPdf } from "./editable-pages";
import { downloadBlob, type BookWordMetadata } from "@/lib/word-export";
import type { ExportProgressHandler } from "./types";
import type { QuizQuestion } from "@/lib/validation/quiz";
import { quizChapterMarkdown } from "@/lib/books/document";

export async function exportQuizDocument(title: string, questions: QuizQuestion[], format: "pdf" | "docx", metadata: { author?: string | null; mode?: string; date?: Date }) {
  const details = `${questions.length} questions · ${metadata.mode?.replaceAll("_", " ") || "Quiz"} · ${(metadata.date ?? new Date()).toLocaleDateString()}\n\nAuthor: ${metadata.author?.trim() || "Memoria user"}`;
  await exportEditableMarkdown(title, `${details}\n\n## Questions\n\n${quizChapterMarkdown(questions)}`, format);
}

export async function exportEditableMarkdown(title: string, markdown: string, format: "pdf" | "docx", bookCover?: BookWordMetadata, onProgress?: ExportProgressHandler) {
  const rendered = await renderCanonicalMmdDocument({ title, markdown, bookCover, onProgress });
  try {
    const pages = await prepareEditablePages(rendered.pages, onProgress);
    const word = await createEditablePagesWord(title, pages);
    onProgress?.({ phase: "creating", message: `Creating ${format === "docx" ? "editable Word document" : "PDF document"}…` });
    await downloadBlob(format === "docx" ? word : await createEditablePagesPdf(title, pages, word), title, format);
  } finally { rendered.cleanup(); }
}
