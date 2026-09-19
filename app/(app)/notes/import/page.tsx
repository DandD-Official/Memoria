"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Dialog } from "@/components/ui/dialog";
import { Upload, Link2, FileText, Cloud, Copy, Check, ArrowRight } from "lucide-react";
import { FileDropzone } from "@/components/notes/file-dropzone";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { stripCodeFences } from "@/lib/validation/reviewer";
import { applyOcrKeepPreferences, DEFAULT_OCR_KEEP, OCR_KEEP_OPTIONS, type OcrKeepOption } from "@/lib/prompts/ocr-options";

type Tab = "file" | "write" | "link" | "cloud";
type Status = "idle" | "processing" | "failed";
type LinkType = "GOOGLE_DOCS" | "NOTION" | "UNKNOWN" | null;

/** Safe client-side link-type detection — never throws on a malformed URL. */
function detectLinkType(rawUrl: string): LinkType {
  if (!rawUrl.trim()) return null;
  try {
    const withProtocol = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    const { hostname } = new URL(withProtocol);
    if (hostname.includes("docs.google.com")) return "GOOGLE_DOCS";
    if (hostname === "app.notion.com" || hostname.includes("notion.so") || hostname.endsWith(".notion.site")) return "NOTION";
    return "UNKNOWN";
  } catch {
    return "UNKNOWN";
  }
}

const LINK_GUIDANCE: Record<Exclude<LinkType, null>, string> = {
  GOOGLE_DOCS:
    "For private Google Docs, connect your Google account and choose the document from the Connected Apps tab.",
  NOTION:
    "Memoria imports this page through your personal Notion connection. Connect Notion in Settings first.",
  UNKNOWN: "We couldn't recognize this as a Google Docs or Notion link — that's fine, just paste the content below.",
};

function OcrKeepSelector({ selected, onToggle }: { selected: OcrKeepOption[]; onToggle: (option: OcrKeepOption) => void }) {
  return (
    <div className="mt-5 rounded-lg border border-accent/30 bg-accent-soft/20 p-4">
      <p className="font-medium text-ink">AI/OCR tool selected</p>
      <p className="mt-1 text-xs leading-relaxed text-ink-soft">Choose the content types to keep. Your selection is added to the prompt as a priority for the AI/OCR tool.</p>
      <fieldset className="mt-4">
        <legend className="mb-2 text-sm font-medium text-ink">Keep in the imported note</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {OCR_KEEP_OPTIONS.map((option) => {
            const isSelected = selected.includes(option.value);
            return (
              <label key={option.value} className={cn("flex min-h-12 cursor-pointer items-start gap-3 rounded-control border p-3 transition-colors", isSelected ? "border-accent bg-surface" : "border-line bg-surface/50 hover:border-ink-faint")}>
                <input type="checkbox" checked={isSelected} onChange={() => onToggle(option.value)} className="mt-0.5 h-4 w-4 accent-accent" />
                <span className="min-w-0"><span className="block text-sm font-medium text-ink">{option.label}</span><span className="mt-0.5 block text-xs text-ink-soft">{option.description}</span></span>
              </label>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-ink-faint">{selected.length} content type{selected.length === 1 ? "" : "s"} selected. At least one must remain selected.</p>
      </fieldset>
    </div>
  );
}

export default function ImportNotePage() {
  const router = useRouter();
  const [imported, setImported] = useState<{ href: string; noteId?: string } | null>(null);
  const [processingStage, setProcessingStage] = useState("Reading your material");
  const [tab, setTab] = useState<Tab>("file");
  const [file, setFile] = useState<File | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [link, setLink] = useState("");
  const [title, setTitle] = useState("");
  const [pastedContent, setPastedContent] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cloudProvider, setCloudProvider] = useState<"google" | "notion">("google");
  const [resources, setResources] = useState<Array<{ id: string; name: string; url?: string; modifiedTime?: string }>>([]);
  const [selectedResource, setSelectedResource] = useState("");
  const [imageWarning, setImageWarning] = useState<{ prompt: string; errors: Array<{ filename: string; error: string }> } | null>(null);
  const [showOcrHelp, setShowOcrHelp] = useState(false);
  const [ocrKeep, setOcrKeep] = useState<OcrKeepOption[]>([...DEFAULT_OCR_KEEP]);
  const [ocrResult, setOcrResult] = useState("");
  const [promptCopied, setPromptCopied] = useState(false);

  const linkType = useMemo(() => detectLinkType(link), [link]);

  function navigateAfterSave(href: string) {
    const noteId = href.match(/^\/notes\/([^/]+)$/)?.[1];
    setImported({ href: href === "/dashboard" ? "/library" : href, noteId });
    setStatus("idle");
    setImageWarning(null);
    router.refresh();
  }
  async function handleFileImport() {
    if (!file) return;
    setError(null);
    setNotice(null);
    setStatus("processing");
    try {
      setProcessingStage("Checking the text and images in your files");
      const previewForm = new FormData();
      for (const selected of files.length ? files : [file]) previewForm.append("file", selected);
      previewForm.append("mode", "preview");
      const previewResponse = await fetch("/api/notes/import", { method: "POST", body: previewForm });
      const preview = await previewResponse.json().catch(() => null);
      if (!previewResponse.ok || !preview) throw new Error(preview?.error ?? "Import preview failed.");
      if (preview.hasImageIssue) {
        setImageWarning({ prompt: preview.extractionPrompt ?? "Extract all text from these images as Markdown.", errors: preview.errors ?? [] });
        setShowOcrHelp(false);
        setOcrKeep([...DEFAULT_OCR_KEEP]);
        setOcrResult("");
        setPromptCopied(false);
        setStatus("idle");
        return;
      }
      setProcessingStage("Saving your editable source notes");
      await performFileImport(false);
    } catch (caught) {
      setStatus("failed");
      setError(caught instanceof Error ? caught.message : "We couldn't reach the server. Check your connection and try again.");
    }
  }

  async function performFileImport(confirmPartial: boolean) {
    if (!file) return;
    setStatus("processing"); setError(null);
    const form = new FormData();
    for (const selected of files.length ? files : [file]) form.append("file", selected);
    if (confirmPartial) form.append("confirmPartial", "true");
    try {
      const res = await fetch("/api/notes/import", { method: "POST", body: form });
      const data = await res.json().catch(() => null);
      if (!data) {
        setStatus("failed");
        setError("The server sent back something unexpected. Please try again.");
        return;
      }
      if (!res.ok) {
        setStatus("failed");
        setError(data.error ?? "Import failed.");
        return;
      }
      if (data.errors?.length) setNotice(`${(data.notes?.length ?? 0) + (data.restored?.length ?? 0)} imported; ${data.errors.length} failed. ${data.errors[0].error}`);
      if (data.redirect) navigateAfterSave(data.redirect);
      else if ((data.notes?.length ?? 0) + (data.restored?.length ?? 0) > 1) navigateAfterSave("/dashboard");
      else if (data.note) navigateAfterSave(`/notes/${data.note.id}`);
    } catch {
      setStatus("failed");
      setError("We couldn't reach the server. Check your connection and try again.");
    }
  }

  async function saveOcrResult() {
    if (!ocrResult.trim()) return;
    setStatus("processing");
    const content = stripCodeFences(ocrResult);
    const response = await fetch("/api/notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: file?.name.replace(/\.[^/.]+$/, "") || "OCR import", content }) });
    const data = await response.json().catch(() => null);
    if (response.ok) navigateAfterSave(`/notes/${data.note.id}`);
    else { setStatus("failed"); setError(data?.error ?? "Couldn't save the extracted text."); }
  }

  function toggleOcrKeep(option: OcrKeepOption) {
    const next = ocrKeep.includes(option) ? ocrKeep.filter((value) => value !== option) : [...ocrKeep, option];
    if (!next.length) return;
    setOcrKeep(next);
    setImageWarning((current) => current ? { ...current, prompt: applyOcrKeepPreferences(current.prompt, next) } : current);
  }

  async function handleNotionImport() {
    setError(null);
    setNotice(null);
    setStatus("processing");
    try {
      const res = await fetch("/api/notes/import/notion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: link.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!data) {
        setStatus("failed");
        setError("The server sent back something unexpected. Please try again.");
        return;
      }
      if (!res.ok) {
        setStatus("failed");
        setError(data.error ?? "Import failed.");
        return;
      }
      navigateAfterSave(`/notes/${data.note.id}`);
    } catch {
      setStatus("failed");
      setError("We couldn't reach the server. Check your connection and try again.");
    }
  }

  async function handlePastedSave() {
    setError(null);
    if (!pastedContent.trim()) {
      setError("Paste the note content first.");
      return;
    }

    let resolvedTitle = title.trim();
    if (!resolvedTitle && link.trim()) {
      try {
        const withProtocol = /^https?:\/\//i.test(link) ? link : `https://${link}`;
        resolvedTitle = new URL(withProtocol).hostname;
      } catch {
        resolvedTitle = "Imported note";
      }
    }

    setStatus("processing");
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: resolvedTitle || "Imported note", content: pastedContent }),
      });
      const data = await res.json().catch(() => null);
      if (!data) {
        setStatus("failed");
        setError("The server sent back something unexpected. Please try again.");
        return;
      }
      if (!res.ok) {
        setStatus("failed");
        setError(data.error ?? "Import failed.");
        return;
      }
      navigateAfterSave(`/notes/${data.note.id}`);
    } catch {
      setStatus("failed");
      setError("We couldn't reach the server. Check your connection and try again.");
    }
  }

  async function loadCloudResources(provider: "google" | "notion") {
    setCloudProvider(provider);
    setSelectedResource("");
    setResources([]);
    setError(null);
    setStatus("processing");
    try {
      const response = await fetch(`/api/integrations/${provider}/resources`, { cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error ?? `Couldn't read ${provider}.`);
        setStatus("failed");
        return;
      }
      setResources(data.resources ?? []);
      setStatus("idle");
    } catch {
      setError("We couldn't reach the server.");
      setStatus("failed");
    }
  }

  async function importCloudResource() {
    const resource = resources.find((item) => item.id === selectedResource);
    if (!resource) return;
    setStatus("processing");
    setError(null);
    try {
      const endpoint = `/api/notes/import/${cloudProvider}`;
      const body = cloudProvider === "google" ? { fileId: resource.id } : { url: resource.url };
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error ?? "Import failed.");
        setStatus("failed");
        return;
      }
      navigateAfterSave(`/notes/${data.note.id}`);
    } catch {
      setError("We couldn't reach the server.");
      setStatus("failed");
    }
  }

  if (imported) return <div className="mx-auto max-w-4xl py-8"><p className="eyebrow">Captured / Ready to connect</p><Check className="mt-8 h-10 w-10 text-success" /><h1 className="mt-5 font-display text-4xl tracking-tight">Your material has a home.</h1><p className="mt-4 max-w-lg text-sm leading-relaxed text-ink-soft">Read through what came in, then give it a shape that helps you learn.</p>{notice && <p role="status" className="mt-4 annotation">{notice}</p>}<div className="mt-8 divide-y divide-line border-y border-line"><Link href={imported.href} className="flex items-center justify-between gap-4 py-6"><span><span className="index-label">01 / Check the source</span><span className="mt-2 block font-display text-xl">Open your material</span></span><ArrowRight className="h-5 w-5" /></Link>{imported.noteId && <><Link href={`/reviewers?fromNote=${imported.noteId}`} className="flex items-center justify-between gap-4 py-6"><span><span className="index-label">02 / Make sense of it</span><span className="mt-2 block font-display text-xl">Build a study guide</span></span><ArrowRight className="h-5 w-5" /></Link><Link href={`/quizzes?fromNote=${imported.noteId}`} className="flex items-center justify-between gap-4 py-6"><span><span className="index-label">03 / Try what you know</span><span className="mt-2 block font-display text-xl">Create a practice set</span></span><ArrowRight className="h-5 w-5" /></Link></>}</div><Button variant="ghost" className="mt-6" onClick={() => { setImported(null); setFile(null); setFiles([]); setPastedContent(""); setNotice(null); }}>Bring in more material</Button></div>;
  return (
    <div className="mx-auto max-w-5xl">
      <p className="section-kicker">Start with what you already have</p>
      <h1 className="mt-3 font-display text-4xl tracking-tight text-ink">Bring your material.</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">Bring in a file, paste a lesson, or connect a source. Your material stays editable and ready to shape into a reviewer.</p>

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[14rem_minmax(0,1fr)]">
      <div><p className="index-label mb-4">01 / Choose your source</p><div className="grid grid-cols-2 gap-2 lg:grid-cols-1" role="group" aria-label="Import source">
        {([{ key: "file", label: "Files & documents", detail: "PDF, slides, Word, text, JSON", icon: Upload }, { key: "write", label: "Write or paste", detail: "Start with your own words", icon: FileText }, { key: "link", label: "A shared link", detail: "Google Docs or Notion", icon: Link2 }, { key: "cloud", label: "Connected sources", detail: "Choose from your accounts", icon: Cloud }] as const).map(source => <button key={source.key} type="button" disabled={status === "processing"} aria-pressed={tab === source.key} onClick={() => { setTab(source.key); setError(null); if (source.key === "cloud" && resources.length === 0) void loadCloudResources(cloudProvider); }} className={cn("min-h-20 rounded-control border p-3 text-left", tab === source.key ? "border-action bg-accent-soft" : "border-line hover:bg-surface-muted")}><source.icon className="mb-2 h-4 w-4" /><span className="block text-sm font-medium">{source.label}</span><span className="mt-1 block text-xs leading-relaxed text-ink-soft">{source.detail}</span></button>)}
      </div><p className="annotation mt-6 hidden lg:block">Your original material becomes an editable note. You decide what to make from it next.</p></div>
      <div className="min-w-0 border-t-2 border-action bg-surface p-5 sm:p-7"><p className="index-label mb-6">02 / {tab === "file" ? "Bring in a document" : tab === "cloud" ? "Choose your material" : "Capture the source"}</p>
        {tab === "file" ? (
          <>
            <FileDropzone onFileSelected={setFile} onFilesSelected={setFiles} multiple accept=".md,.txt,.pdf,.docx,.pptx,.json" />
            <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-faint">
              <FileText className="h-3.5 w-3.5" /> Supports .md, .txt, .pdf, .docx, .pptx, and Memoria&apos;s own exported .json files
            </p>
            <p className="mt-1 text-xs text-ink-faint">
              Only text is imported — if a PDF, Word, or PowerPoint file has images or embedded visuals, those are skipped and
              you&apos;ll see a notice after importing.
            </p>
            {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
            {notice && <p className="mt-3 rounded-lg border border-accent/30 bg-accent-soft/40 p-3 text-sm text-accent-dark">{notice}</p>}
            {status === "processing" && <div role="status" className="mt-5 space-y-3"><p className="text-sm text-ink-soft">{processingStage}…</p><div className="h-2 animate-pulse bg-accent-soft" /><p className="text-xs text-ink-faint">Keep this page open while your material is processed.</p></div>}
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => router.push("/notes")}>
                Cancel
              </Button>
              <Button onClick={handleFileImport} disabled={!file} loading={status === "processing"}>
                Import
              </Button>
            </div>
          </>
        ) : tab === "link" || tab === "write" ? (
          <>
            {tab === "link" && <><Label htmlFor="link">Google Docs or Notion link</Label>
            <Input id="link" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://docs.google.com/… or https://app.notion.com/p/…" />

            </>}
            {tab === "link" && linkType && (
              <p className="mt-2 rounded-lg border border-line bg-ink/[0.02] p-3 text-xs text-ink-soft">
                {LINK_GUIDANCE[linkType]}
              </p>
            )}

            {tab === "link" && linkType === "NOTION" ? (
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setLink("")}>
                  Clear
                </Button>
                <Button onClick={handleNotionImport} loading={status === "processing"} disabled={!link.trim()}>
                  Import this page
                </Button>
              </div>
            ) : (
              <>
                <div className="mt-4">
                  <Label htmlFor="import-title">Title</Label>
                  <Input id="import-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Untitled note" />
                </div>

                <div className="mt-4">
                  <Label htmlFor="pasted">Your notes (Markdown supported)</Label>
                  <Textarea
                    id="pasted"
                    rows={8}
                    value={pastedContent}
                    onChange={(e) => setPastedContent(e.target.value)}
                    placeholder="# Paste your exported note here…"
                    className="font-mono text-sm"
                  />
                </div>
              </>
            )}

            {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
            {notice && <p className="mt-3 rounded-lg border border-accent/30 bg-accent-soft/40 p-3 text-sm text-accent-dark">{notice}</p>}

            {(tab === "write" || linkType !== "NOTION") && (
              <div className="mt-5 flex justify-end gap-2">
                <Button variant="ghost" onClick={() => router.push("/notes")}>
                  Cancel
                </Button>
                <Button onClick={handlePastedSave} loading={status === "processing"} disabled={!pastedContent.trim()}>
                  Save note
                </Button>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex gap-2">
              <Button variant={cloudProvider === "google" ? "primary" : "outline"} size="sm" onClick={() => void loadCloudResources("google")}>Google Drive</Button>
              <Button variant={cloudProvider === "notion" ? "primary" : "outline"} size="sm" onClick={() => void loadCloudResources("notion")}>Notion</Button>
            </div>
            <p className="mt-3 text-sm text-ink-soft">Choose a document from your connected account. Manage access in <a className="text-accent-dark underline" href="/settings">Settings</a>.</p>
            {status === "processing" && <p className="mt-4 text-sm text-ink-soft">Loading documents…</p>}
            {resources.length > 0 && (
              <div className="mt-4">
                <Label htmlFor="cloud-resource">Document</Label>
                <select id="cloud-resource" value={selectedResource} onChange={(event) => setSelectedResource(event.target.value)} className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm">
                  <option value="">Select a document…</option>
                  {resources.map((resource) => <option key={resource.id} value={resource.id}>{resource.name}</option>)}
                </select>
              </div>
            )}
            {status !== "processing" && resources.length === 0 && !error && <p className="mt-4 text-sm text-ink-soft">No importable documents were found.</p>}
            {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
            <div className="mt-5 flex justify-end"><Button disabled={!selectedResource} loading={status === "processing"} onClick={() => void importCloudResource()}>Import document</Button></div>
          </>
        )}
      </div>
      </div>
      {imageWarning && <Dialog open onOpenChange={() => setImageWarning(null)} title="Some content needs a closer look" description="Text in scans, images, and charts may be missing. Choose how to continue before anything is saved." className="sm:max-w-2xl">
        <div>
          {imageWarning.errors.length > 0 && <ul className="mt-4 list-disc space-y-1 pl-5 text-xs text-danger">{imageWarning.errors.map((item) => <li key={item.filename}>{item.filename}: {item.error}</li>)}</ul>}
          {showOcrHelp && <OcrKeepSelector selected={ocrKeep} onToggle={toggleOcrKeep} />}
          {!showOcrHelp ? <div className="mt-6 grid gap-3 sm:grid-cols-2"><button onClick={() => { setImageWarning(null); void performFileImport(true); }} className="rounded-lg border border-line p-4 text-left hover:border-accent"><span className="block font-medium text-ink">Continue with partial text</span><span className="mt-1 block text-xs text-ink-soft">Import only the text Memoria could read.</span></button><button onClick={() => setShowOcrHelp(true)} className="rounded-lg border border-accent bg-accent-soft/30 p-4 text-left"><span className="block font-medium text-ink">Use an AI/OCR tool</span><span className="mt-1 block text-xs text-ink-soft">Copy a prepared prompt, then paste the completed extraction back.</span></button></div> : <div className="mt-5"><div className="flex items-center justify-between"><Label htmlFor="ocr-prompt">Extraction prompt</Label><button onClick={async () => { await navigator.clipboard.writeText(imageWarning.prompt); setPromptCopied(true); setTimeout(() => setPromptCopied(false), 1500); }} className="inline-flex items-center gap-1 text-xs font-medium text-accent-dark">{promptCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{promptCopied ? "Copied" : "Copy prompt"}</button></div><Textarea id="ocr-prompt" readOnly rows={7} value={imageWarning.prompt} className="mt-1 font-mono text-xs" /><div className="mt-4"><Label htmlFor="ocr-result">Paste the completed Markdown</Label><Textarea id="ocr-result" rows={8} value={ocrResult} onChange={(event) => setOcrResult(event.target.value)} placeholder="# Extracted lesson…" className="mt-1 font-mono text-sm" /></div></div>}
          <div className="mt-6 flex justify-end gap-2"><Button variant="ghost" onClick={() => { setImageWarning(null); setShowOcrHelp(false); }}>Cancel</Button>{showOcrHelp && <Button onClick={saveOcrResult} disabled={!ocrResult.trim()} loading={status === "processing"}>Save completed import</Button>}</div>
        </div>
      </Dialog>}
    </div>
  );
}
