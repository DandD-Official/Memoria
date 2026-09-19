"use client";

import { useState } from "react";
import { Copy, Check, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { MarkdownRenderer } from "@/components/markdown/renderer";
import { MmdValidationNotice } from "@/components/mmd/validation-notice";
import { FileDropzone } from "@/components/notes/file-dropzone";
import { analyzeReviewerImport } from "@/lib/validation/reviewer";
import { serializeWithFrontmatter } from "@/lib/markdown-frontmatter";
import { cn } from "@/lib/utils";
import { extractFlashcardsFromMarkdown } from "@/lib/flashcards";
import { GuestFlashcards } from "@/components/guest/guest-flashcards";
import { ExportMenu } from "@/components/exports/export-menu";
import type { ExportProgressHandler } from "@/lib/export/types";

const PROCESSING_STYLES = [
  { value: "visual_creative", label: "Visual & Creative" },
  { value: "preserve", label: "Preserve" },
  { value: "balanced", label: "Balanced" },
  { value: "condensed", label: "Condensed" },
  { value: "exam_focused", label: "Exam Focused" },
] as const;

const PLACEHOLDER_NOTE = "[Paste your notes here before sending this prompt to the AI]";

export function GuestReviewerFlow({ initialView = "reviewer" }: { initialView?: "reviewer" | "flashcards" }) {
  const fieldId = `guest-${initialView}`;
  const [notesText, setNotesText] = useState("");
  const [style, setStyle] = useState<(typeof PROCESSING_STYLES)[number]["value"]>("balanced");
  const [prompt, setPrompt] = useState("");
  const [copied, setCopied] = useState(false);
  const [pastedMarkdown, setPastedMarkdown] = useState("");
  const [title, setTitle] = useState("My reviewer");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [resultView, setResultView] = useState<"reviewer" | "flashcards">(initialView);

  async function handleFileUpload(file: File) {
    setUploading(true);
    setError(null);
    setNotice(null);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/guest/extract", { method: "POST", body: form });
      const data = await res.json().catch(() => null);
      if (!data) {
        setError("The server sent back something unexpected. Please try again.");
        setUploading(false);
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "Couldn't read that file.");
        setUploading(false);
        return;
      }
      setNotesText(data.text);
      setTitle(data.title || "My reviewer");
      if (data.notice) setNotice(data.notice);
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    }
    setUploading(false);
  }

  async function generatePrompt() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/guest/prompts/note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title || "My notes", content: notesText.trim() || PLACEHOLDER_NOTE, style }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't generate prompt.");
        setLoading(false);
        return;
      }
      setPrompt(data.text);
    } catch {
      setError("We couldn't reach the server.");
    }
    setLoading(false);
  }

  function copyPrompt() {
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const importAnalysis = analyzeReviewerImport(pastedMarkdown);
  const cleanedMarkdown = importAnalysis.content;
  const isValidLength = cleanedMarkdown.trim().length >= 20;
  const flashcards = extractFlashcardsFromMarkdown(cleanedMarkdown);

  async function exportReviewer(format: string, onProgress?: ExportProgressHandler) {
    if (format === "pdf") { const { exportMarkdownToPdf } = await import("@/lib/pdf-export"); await exportMarkdownToPdf(title, cleanedMarkdown, onProgress); return; }
    if (format === "docx") { const { exportMarkdownToWord } = await import("@/lib/word-export"); await exportMarkdownToWord(title, cleanedMarkdown, onProgress); return; }
    const body = format === "json" ? JSON.stringify({ format: "memoria-reviewer-export", version: "1", title, style: "COMPLETE", content: cleanedMarkdown }) : serializeWithFrontmatter(title, undefined, cleanedMarkdown);
    const blob = new Blob([body], { type: format === "json" ? "application/json" : "text/markdown" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${title.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase()}.${format}`; anchor.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <p className="mb-3 text-sm font-medium text-ink">1. Add your notes (optional but recommended)</p>
        <p className="mb-3 text-xs text-ink-soft">
          Paste your notes below, or upload a file — either way they get embedded directly into the prompt.
          Skip this and the prompt will include a placeholder you can fill in with your AI assistant.
        </p>
        <FileDropzone onFileSelected={handleFileUpload} accept=".md,.txt,.pdf,.docx,.pptx,.json" />
        {uploading && <p className="mt-2 text-xs text-ink-soft">Reading file…</p>}
        {notice && <p className="mt-2 rounded-lg border border-accent/30 bg-accent-soft/40 p-2.5 text-xs text-accent-dark">{notice}</p>}
        <Label htmlFor={`${fieldId}-notes`} className="mt-4">Source notes</Label>
        <Textarea
          id={`${fieldId}-notes`}
          rows={6}
          value={notesText}
          onChange={(e) => setNotesText(e.target.value)}
          placeholder="Paste your raw notes here…"
          className="font-mono text-sm"
        />
        <div role="group" aria-label="Study guide style" className="mt-3 flex flex-wrap items-center gap-2">
          {PROCESSING_STYLES.map((s) => (
            <button
              key={s.value}
              type="button"
              aria-pressed={style === s.value}
              onClick={() => setStyle(s.value)}
              className={cn(
                "min-h-11 rounded-control border px-3 py-2 text-xs font-medium",
                style === s.value ? "border-accent bg-accent-soft text-accent-dark" : "border-line text-ink-soft hover:bg-ink/5"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        {error && <p className="mt-3 text-sm text-danger" role="alert">{error}</p>}
        <Button className="mt-4" onClick={generatePrompt} loading={loading}>
          Generate prompt
        </Button>
      </div>

      {prompt && (
        <div className="card p-5">
          <Label htmlFor={`${fieldId}-prompt`}>2. Copy this into your AI assistant</Label>
          <Textarea id={`${fieldId}-prompt`} readOnly rows={10} value={prompt} className="font-mono text-xs" />
          <Button variant="outline" size="sm" className="mt-2" onClick={copyPrompt}>
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? "Copied" : "Copy prompt"}
          </Button>

          <Label htmlFor={`${fieldId}-response`} className="mt-5">3. Paste the AI&apos;s Markdown response</Label>
          <Textarea
            id={`${fieldId}-response`}
            rows={8}
            value={pastedMarkdown}
            onChange={(e) => setPastedMarkdown(e.target.value)}
            placeholder="# Reviewer title&#10;&#10;## Section&#10;..."
            className="font-mono text-xs"
          />
          {importAnalysis.warning && <p className="mt-3 rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm text-ink-soft">{importAnalysis.warning}</p>}

          {isValidLength && (
            <div className="mt-4 space-y-3">
              <div>
                <Label htmlFor={`${fieldId}-title`}>Title</Label>
                <Input id={`${fieldId}-title`} value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="flex gap-1 rounded-lg border border-line bg-surface p-1">
                <button type="button" onClick={() => setResultView("reviewer")} className={cn("flex-1 rounded-md py-2 text-sm font-medium", resultView === "reviewer" ? "bg-action text-action-foreground" : "text-ink-soft")}>Reviewer</button>
                <button type="button" onClick={() => setResultView("flashcards")} className={cn("flex-1 rounded-md py-2 text-sm font-medium", resultView === "flashcards" ? "bg-action text-action-foreground" : "text-ink-soft")}>Flashcards ({flashcards.length})</button>
              </div>
              <div className="max-h-[32rem] overflow-y-auto rounded-lg border border-line bg-surface p-5">
                {resultView === "reviewer" ? <MarkdownRenderer content={cleanedMarkdown} /> : <GuestFlashcards cards={flashcards} />}
              </div>
              {resultView === "reviewer" && <MmdValidationNotice content={cleanedMarkdown} />}
              <ExportMenu options={[{ value: "pdf", label: "PDF document" }, { value: "docx", label: "Word document" }, { value: "md", label: "Markdown" }, { value: "json", label: "Memoria JSON" }]} onExport={exportReviewer} />
              <p className="flex items-center gap-1.5 text-xs text-ink-faint">
                <Upload className="h-3.5 w-3.5" /> Want to save this and build quizzes from it later? Create a free account.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
