import { NextResponse } from "next/server";
import type { NoteSourceType } from "@prisma/client";
import { requireUserOrNull } from "@/lib/auth/session";
import { extractTextFromFile, FileParseError } from "@/lib/imports/file-parser";
import { createNote } from "@/lib/notes-repo";
import { withApiErrorHandling } from "@/lib/api/handler";
import { createReviewer } from "@/lib/reviewers-repo";
import { createReviewerSchema } from "@/lib/validation/reviewer";
import { createQuizSchema } from "@/lib/validation/quiz";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { buildOcrExtractionPrompt } from "@/lib/prompts/ocr-prompt";

export const POST = withApiErrorHandling(async (request: Request) => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const form = await request.formData().catch(() => null);
  const files = (form?.getAll("file") ?? []).filter((value): value is File => value instanceof File).slice(0, 20);
  if (!files.length) return NextResponse.json({ error: "No file was uploaded." }, { status: 400 });
  if (files.reduce((sum, file) => sum + file.size, 0) > 25 * 1024 * 1024) return NextResponse.json({ error: "Batch uploads are limited to 25 MB total." }, { status: 413 });

  const previewOnly = form?.get("mode") === "preview";
  const confirmPartial = form?.get("confirmPartial") === "true";
  const extracted: Array<{ file: File; text: string; extension: string; title?: string; description?: string; hasImages: boolean }> = [];
  const ownExports: Array<{ file: File; payload: Record<string, unknown>; kind: "REVIEWER" | "QUIZ" }> = [];
  const errors: Array<{ filename: string; error: string; imageRelated: boolean }> = [];
  for (const file of files) {
    try {
      if (file.name.toLowerCase().endsWith(".json")) {
        let raw: Record<string, unknown>;
        try { raw = JSON.parse(await file.text()) as Record<string, unknown>; }
        catch { throw new FileParseError("This JSON file is corrupted or incomplete. Export it again from Memoria and retry."); }
        const format = String(raw?.format ?? "");
        if (["memora-reviewer-export", "memoria-reviewer-export"].includes(format)) { ownExports.push({ file, payload: raw, kind: "REVIEWER" }); continue; }
        if (["memora-quiz-v1", "memoria-quiz-v1"].includes(format)) { ownExports.push({ file, payload: raw, kind: "QUIZ" }); continue; }
        if (/^memori?a-/i.test(format)) throw new FileParseError(`This Memoria export format (${format}) is not compatible with this version of the app.`);
      }
      const result = await extractTextFromFile(file);
      extracted.push({ file, ...result, hasImages: Boolean(result.hasImages) });
    } catch (error) {
      if (!(error instanceof FileParseError)) throw error;
      errors.push({ filename: file.name, error: error.message, imageRelated: /scan|image|text layer/i.test(error.message) });
    }
  }

  const hasImageIssue = extracted.some((item) => item.hasImages) || errors.some((item) => item.imageRelated);
  if (previewOnly) return NextResponse.json({
    previews: extracted.map((item) => ({ filename: item.file.name, title: item.title, text: item.text, hasImages: item.hasImages })),
    ownExports: ownExports.map((item) => ({ filename: item.file.name, kind: item.kind, title: item.payload.title })),
    errors,
    hasImageIssue,
    extractionPrompt: hasImageIssue ? buildExtractionPrompt(extracted, errors) : undefined,
  });
  if (hasImageIssue && !confirmPartial) return NextResponse.json({ error: "This import contains image content that could not be extracted. Review the warning before continuing.", requiresImageConfirmation: true, extractionPrompt: buildExtractionPrompt(extracted, errors) }, { status: 409 });

  const notes = [];
  const restored: Array<{ id: string; type: "REVIEWER" | "QUIZ"; href: string }> = [];
  for (const item of ownExports) {
    if (item.kind === "REVIEWER") {
      const parsed = createReviewerSchema.safeParse({ title: item.payload.title, description: item.payload.description, style: item.payload.style, content: item.payload.content, noteIds: [] });
      if (!parsed.success) { errors.push({ filename: item.file.name, error: `Incompatible reviewer export: ${parsed.error.issues[0]?.message ?? "invalid data"}`, imageRelated: false }); continue; }
      const reviewer = await createReviewer({ ownerId: user.id, ...parsed.data });
      restored.push({ id: reviewer.id, type: "REVIEWER", href: `/reviewers/${reviewer.id}` });
    } else {
      const settings = item.payload.settings && typeof item.payload.settings === "object" ? item.payload.settings as Record<string, unknown> : {};
      const parsed = createQuizSchema.safeParse({ title: item.payload.title, description: item.payload.description, mode: item.payload.mode ?? settings.mode, configuration: { distribution: "balanced", randomizeQuestions: true, randomizeChoices: true, feedback: "after_submission", attempts: "unlimited", ...settings }, questions: item.payload.questions, noteIds: [], reviewerIds: [] });
      if (!parsed.success) { errors.push({ filename: item.file.name, error: `Incompatible quiz export: ${parsed.error.issues[0]?.message ?? "invalid data"}`, imageRelated: false }); continue; }
      const quiz = await prisma.quiz.create({ data: { ownerId: user.id, title: parsed.data.title, description: parsed.data.description, mode: parsed.data.mode, configuration: parsed.data.configuration, questions: parsed.data.questions } });
      restored.push({ id: quiz.id, type: "QUIZ", href: `/quizzes/${quiz.id}` });
    }
  }
  for (const item of extracted) {
    const titleOverride = form?.get("title");
    const title = typeof titleOverride === "string" && titleOverride.trim() ? titleOverride.trim() : item.title || item.file.name.replace(/\.[^/.]+$/, "");
    const sourceType: NoteSourceType = item.extension === "pdf" ? "PDF" : item.extension === "docx" ? "DOCX" : item.extension === "txt" ? "TXT" : item.extension === "json" ? "MANUAL" : "MARKDOWN";
    notes.push(await createNote({ ownerId: user.id, title, description: item.description, originalFilename: item.file.name, sourceType, fileExtension: item.extension, content: item.text }));
  }
  if (!notes.length && !restored.length) return NextResponse.json({ error: errors[0]?.error ?? "No files could be imported.", errors, status: "failed", hasImageIssue, extractionPrompt: buildExtractionPrompt(extracted, errors) }, { status: 422 });
  revalidatePath("/notes");
  revalidatePath("/dashboard");
  revalidatePath("/search");
  return NextResponse.json({ note: notes[0], notes, restored, redirect: restored.length === 1 && !notes.length ? restored[0].href : undefined, errors, status: errors.length ? "partial" : "complete" }, { status: 201 });
});

function buildExtractionPrompt(extracted: Array<{ file: File; text: string }>, errors: Array<{ filename: string }>) {
  return buildOcrExtractionPrompt(
    extracted.map((item) => ({ name: item.file.name, text: item.text })),
    errors.map((item) => item.filename)
  );
}
