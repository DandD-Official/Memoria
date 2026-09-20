"use client";

import type { QuizQuestion } from "@/lib/validation/quiz";
import { ExportMenu } from "@/components/exports/export-menu";

export function ExportQuizPdfButton({ quizId, title, questions, author, mode }: { quizId: string; title: string; questions: QuizQuestion[]; author?: string | null; mode?: string }) {
  async function handleExport(format: string) {
    if (format === "pdf") { const { exportQuizToPdf } = await import("@/lib/pdf-export"); await exportQuizToPdf(title, questions, { author, mode }); return; }
    if (format === "docx") { const { exportQuizToWord } = await import("@/lib/word-export"); await exportQuizToWord(title, questions, { author, mode }); return; }
    window.location.href = `/api/quizzes/export?id=${quizId}&format=${format}`;
  }
  return <ExportMenu options={[{ value: "pdf", label: "PDF document" }, { value: "docx", label: "Word document" }, { value: "json", label: "Memoria JSON" }, { value: "txt", label: "Plain text" }]} onExport={handleExport} />;
}
