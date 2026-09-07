"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, Plus, X, Sparkles, FileText, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { MarkdownRenderer } from "@/components/markdown/renderer";
import { MmdValidationNotice } from "@/components/mmd/validation-notice";
import { stripCodeFences } from "@/lib/validation/reviewer";
import { cn } from "@/lib/utils";

const STYLES = [
  { value: "COMPLETE", label: "Complete" },
  { value: "QUICK", label: "Quick" },
  { value: "EXAM", label: "Exam" },
  { value: "CONCEPT", label: "Concept" },
  { value: "DEFINITION", label: "Definition" },
  { value: "COMPARISON", label: "Comparison" },
] as const;

const PROCESSING_STYLES = [
  { value: "preserve", label: "Preserve — keep almost everything" },
  { value: "balanced", label: "Balanced — clean and organize" },
  { value: "condensed", label: "Condensed — shorter, key points only" },
  { value: "exam_focused", label: "Exam Focused — prioritize testable content" },
] as const;

interface Note {
  id: string;
  title: string;
}

export function ReviewerWizard({ notes, defaultNoteId, initiallyOpen = false, initialPath }: { notes: Note[]; defaultNoteId?: string; initiallyOpen?: boolean; initialPath?: "notes" | "import" }) {
  const router = useRouter();
  const [open, setOpen] = useState(Boolean(defaultNoteId) || initiallyOpen);
  const [creationPath, setCreationPath] = useState<"notes" | "import" | null>(initialPath ?? (defaultNoteId ? "notes" : null));
  const [step, setStep] = useState(initialPath === "import" ? 4 : 1);
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>(defaultNoteId ? [defaultNoteId] : []);
  const [style, setStyle] = useState<(typeof STYLES)[number]["value"]>("COMPLETE");
  const [processingStyle, setProcessingStyle] = useState<(typeof PROCESSING_STYLES)[number]["value"]>("balanced");
  const [prompt, setPrompt] = useState("");
  const [copied, setCopied] = useState(false);
  const [pastedMarkdown, setPastedMarkdown] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleNote(id: string) {
    setSelectedNoteIds((prev) => (prev.includes(id) ? prev.filter((n) => n !== id) : [...prev, id]));
  }

  async function generatePrompt() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/prompts/note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteIds: selectedNoteIds, style: processingStyle, mode: "prompt" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't generate prompt.");
        setLoading(false);
        return;
      }
      setPrompt(data.text);
      setStep(3);
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

  async function generateWithConnectedAi() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(payload?.error ?? "AI generation failed.");
        return;
      }
      const cleaned = stripCodeFences(payload.text);
      setPastedMarkdown(cleaned);
      setTitle(extractTitleFromMarkdown(cleaned));
      setStep(4);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "AI generation failed.");
    } finally {
      setLoading(false);
    }
  }

  const cleanedMarkdown = stripCodeFences(pastedMarkdown);
  const isValidLength = cleanedMarkdown.trim().length >= 20;

  function extractTitleFromMarkdown(md: string): string {
    const h1 = md.match(/^#\s+(.+)$/m);
    return h1 ? h1[1].trim() : "Untitled reviewer";
  }

  async function handleSave() {
    if (!isValidLength) return;
    setLoading(true);
    setError(null);
    const res = await fetch("/api/reviewers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title || extractTitleFromMarkdown(cleanedMarkdown),
        style,
        noteIds: selectedNoteIds,
        content: cleanedMarkdown,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Couldn't save reviewer.");
      return;
    }
    router.push(`/reviewers/${data.reviewer.id}`);
  }

  async function importReviewerFile(file: File) {
    setError(null);
    try {
      const raw = await file.text();
      let content = raw;
      let recoveredTitle = file.name.replace(/\.[^/.]+$/, "");
      if (file.name.toLowerCase().endsWith(".json")) {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        if (!(["memora-reviewer-export", "memoria-reviewer-export"].includes(String(parsed.format))) || typeof parsed.content !== "string") throw new Error("Choose a Memoria reviewer JSON export, or import a Markdown/text file.");
        content = parsed.content;
        if (typeof parsed.title === "string") recoveredTitle = parsed.title;
      }
      setPastedMarkdown(content);
      setTitle(recoveredTitle);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "This file couldn't be read.");
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Create reviewer
      </Button>
    );
  }

  return (
    <div className="card p-6">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-display text-lg text-ink">New reviewer</h2>
        <button onClick={() => setOpen(false)} className="text-ink-faint hover:text-ink">
          <X className="h-4 w-4" />
        </button>
      </div>

      {!creationPath && <div>
        <p className="mb-4 text-sm text-ink-soft">How would you like to create this reviewer?</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <button onClick={() => { setCreationPath("notes"); setStep(1); }} className="rounded-xl border border-line bg-surface p-5 text-left transition-colors hover:border-accent"><FileText className="mb-3 h-6 w-6 text-accent-dark" /><span className="block font-display text-lg text-ink">From your Notes</span><span className="mt-1 block text-sm text-ink-soft">Select one or more notes and build a structured reviewer.</span></button>
          <button onClick={() => { setCreationPath("import"); setStep(4); }} className="rounded-xl border border-line bg-surface p-5 text-left transition-colors hover:border-accent"><Upload className="mb-3 h-6 w-6 text-accent-dark" /><span className="block font-display text-lg text-ink">Import</span><span className="mt-1 block text-sm text-ink-soft">Upload a Memoria export, Markdown, or text reviewer.</span></button>
        </div>
      </div>}

      {creationPath && <div className="mb-6 flex flex-wrap gap-2 text-xs font-medium text-ink-faint">
        {["Select notes", "Choose style", "Generate & copy", "Paste result"].map((label, i) => (
          <span key={label} className={cn("rounded-full px-2.5 py-1", step === i + 1 ? "bg-action text-action-foreground" : "bg-ink/5")}>
            {i + 1}. {label}
          </span>
        ))}
      </div>}

      {creationPath === "notes" && step === 1 && (
        <div>
          <p className="mb-4 text-sm text-ink-soft">Choose from the notes already in your library. You do not need to upload the same material again.</p>
          {notes.length === 0 ? (
            <p className="text-sm text-ink-soft">You don&apos;t have any notes yet. Import a note first.</p>
          ) : (
            <div className="max-h-64 space-y-1.5 overflow-y-auto">
              {notes.map((note) => (
                <label key={note.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-line p-2.5 hover:bg-ink/5">
                  <input type="checkbox" checked={selectedNoteIds.includes(note.id)} onChange={() => toggleNote(note.id)} />
                  <span className="text-sm text-ink">{note.title}</span>
                </label>
              ))}
            </div>
          )}
          <div className="mt-5 flex justify-end">
            <Button disabled={selectedNoteIds.length === 0} onClick={() => setStep(2)}>
              Next
            </Button>
          </div>
        </div>
      )}

      {creationPath === "notes" && step === 2 && (
        <div>
          <Label>Reviewer style</Label>
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {STYLES.map((s) => (
              <button
                key={s.value}
                onClick={() => setStyle(s.value)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm",
                  style === s.value ? "border-action bg-action text-action-foreground" : "border-line text-ink-soft hover:bg-ink/5"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
          <Label>Processing style</Label>
          <div className="space-y-1.5">
            {PROCESSING_STYLES.map((p) => (
              <label key={p.value} className="flex cursor-pointer items-center gap-2 rounded-lg border border-line p-2.5 hover:bg-ink/5">
                <input type="radio" name="processing" checked={processingStyle === p.value} onChange={() => setProcessingStyle(p.value)} />
                <span className="text-sm text-ink">{p.label}</span>
              </label>
            ))}
          </div>
          {error && <p className="mt-3 text-sm text-danger">{error}</p>}
          <div className="mt-5 flex justify-between">
            <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
            <Button onClick={generatePrompt} loading={loading}>Generate prompt</Button>
          </div>
        </div>
      )}

      {creationPath === "notes" && step === 3 && (
        <div>
          <p className="mb-2 text-sm text-ink-soft">Copy this prompt and paste it into Claude or another AI assistant.</p>
          <Textarea readOnly rows={10} value={prompt} className="font-mono text-xs" />
          <div className="mt-3 flex justify-between">
            <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
            <div className="flex gap-2">
              <Button onClick={() => void generateWithConnectedAi()} loading={loading}>
                <Sparkles className="h-4 w-4" /> Generate here
              </Button>
              <Button variant="outline" onClick={copyPrompt}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copied" : "Copy prompt"}
              </Button>
              <Button onClick={() => setStep(4)}>I have the result</Button>
            </div>
          </div>
        </div>
      )}

      {creationPath && step === 4 && (
        <div>
          {creationPath === "import" && <label className="mb-4 flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-line bg-surface p-5 text-sm font-medium text-ink-soft hover:border-accent"><Upload className="h-4 w-4" /> Choose .md, .txt, or Memoria .json<input type="file" accept=".md,.txt,.json" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importReviewerFile(file); }} /></label>}
          <Label htmlFor="mdresult">Paste the AI&apos;s Markdown response</Label>
          <Textarea
            id="mdresult"
            rows={10}
            value={pastedMarkdown}
            onChange={(e) => setPastedMarkdown(e.target.value)}
            className="font-mono text-xs"
            placeholder="# Reviewer title&#10;&#10;## Section&#10;..."
          />
          <p className="mt-1 text-xs text-ink-faint">
            If it&apos;s wrapped in a ```markdown code fence, that&apos;s fine — Memoria strips it automatically.
          </p>

          {pastedMarkdown.trim() && !isValidLength && (
            <p className="mt-3 rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
              This looks too short to be a full reviewer — check you pasted the AI&apos;s complete response.
            </p>
          )}

          {isValidLength && (
            <div className="mt-4 space-y-3">
              <div className="rounded-lg border border-success/30 bg-success/5 p-3 text-sm text-success">
                Looks good. Here&apos;s a preview:
              </div>
              <div>
                <Label htmlFor="reviewer-title">Reviewer title</Label>
                <Input
                  id="reviewer-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={extractTitleFromMarkdown(cleanedMarkdown)}
                />
              </div>
              <div className="max-h-64 overflow-y-auto rounded-lg border border-line bg-surface p-4">
                <MarkdownRenderer content={cleanedMarkdown} />
              </div>
              <MmdValidationNotice content={cleanedMarkdown} />
            </div>
          )}

          {error && <p className="mt-3 text-sm text-danger">{error}</p>}

          <div className="mt-5 flex justify-between">
            <Button variant="ghost" onClick={() => creationPath === "import" ? setCreationPath(null) : setStep(3)}>Back</Button>
            <Button onClick={handleSave} disabled={!isValidLength} loading={loading}>
              Save reviewer
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
