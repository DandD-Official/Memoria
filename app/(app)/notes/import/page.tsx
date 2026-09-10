"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Link2, FileText, Cloud, Copy, Check, AlertTriangle } from "lucide-react";
import { FileDropzone } from "@/components/notes/file-dropzone";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { stripCodeFences } from "@/lib/validation/reviewer";

type Tab = "file" | "link" | "cloud";
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

export default function ImportNotePage() {
  const router = useRouter();
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
  const [ocrResult, setOcrResult] = useState("");
  const [promptCopied, setPromptCopied] = useState(false);

  const linkType = useMemo(() => detectLinkType(link), [link]);

  function navigateAfterSave(href: string) {
    router.push(href);
    // A mutation can leave previously visited library pages in the App
    // Router cache. Refresh after navigation so the new note is visible.
    router.refresh();
  }

  async function handleFileImport() {
    if (!file) return;
    setError(null);
    setNotice(null);
    setStatus("processing");
    try {
      const previewForm = new FormData();
      for (const selected of files.length ? files : [file]) previewForm.append("file", selected);
      previewForm.append("mode", "preview");
      const previewResponse = await fetch("/api/notes/import", { method: "POST", body: previewForm });
      const preview = await previewResponse.json().catch(() => null);
      if (!previewResponse.ok || !preview) throw new Error(preview?.error ?? "Import preview failed.");
      if (preview.hasImageIssue) {
        setImageWarning({ prompt: preview.extractionPrompt ?? "Extract all text from these images as Markdown.", errors: preview.errors ?? [] });
        setStatus("idle");
        return;
      }
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

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-2xl text-ink">Import a note</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Bring in material from a file or a link. Notes are stored as Markdown, so headings, bold text, lists, and
        tables all carry over.
      </p>

      <div className="mt-6 flex gap-1 rounded-lg border border-line bg-surface p-1">
        <button
          onClick={() => setTab("file")}
          className={cn("flex-1 rounded-md py-2 text-sm font-medium", tab === "file" ? "bg-action text-action-foreground" : "text-ink-soft")}
        >
          <Upload className="mr-1.5 inline h-4 w-4" /> Upload File
        </button>
        <button
          onClick={() => setTab("link")}
          className={cn("flex-1 rounded-md py-2 text-sm font-medium", tab === "link" ? "bg-action text-action-foreground" : "text-ink-soft")}
        >
          <Link2 className="mr-1.5 inline h-4 w-4" /> Import Link
        </button>
        <button
          onClick={() => { setTab("cloud"); if (resources.length === 0) void loadCloudResources(cloudProvider); }}
          className={cn("flex-1 rounded-md py-2 text-sm font-medium", tab === "cloud" ? "bg-action text-action-foreground" : "text-ink-soft")}
        >
          <Cloud className="mr-1.5 inline h-4 w-4" /> Connected Apps
        </button>
      </div>

      <div className="card mt-4 p-6">
        {tab === "file" ? (
          <>
            <FileDropzone onFileSelected={setFile} onFilesSelected={setFiles} multiple accept=".md,.txt,.pdf,.docx,.json" />
            <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-faint">
              <FileText className="h-3.5 w-3.5" /> Supports .md, .txt, .pdf, .docx, and Memoria&apos;s own exported .json files
            </p>
            <p className="mt-1 text-xs text-ink-faint">
              Only text is imported — if a PDF or Word file has images (like a scanned page), those are skipped and
              you&apos;ll see a notice after importing.
            </p>
            {error && <p className="mt-3 text-sm text-danger">{error}</p>}
            {notice && <p className="mt-3 rounded-lg border border-accent/30 bg-accent-soft/40 p-3 text-sm text-accent-dark">{notice}</p>}
            {status === "processing" && <p className="mt-3 text-sm text-ink-soft">Extracting content…</p>}
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => router.push("/notes")}>
                Cancel
              </Button>
              <Button onClick={handleFileImport} disabled={!file} loading={status === "processing"}>
                Import
              </Button>
            </div>
          </>
        ) : tab === "link" ? (
          <>
            <Label htmlFor="link">Google Docs or Notion link</Label>
            <Input id="link" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://docs.google.com/… or https://app.notion.com/p/…" />

            {linkType && (
              <p className="mt-2 rounded-lg border border-line bg-ink/[0.02] p-3 text-xs text-ink-soft">
                {LINK_GUIDANCE[linkType]}
              </p>
            )}

            {linkType === "NOTION" ? (
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
                  <Label htmlFor="pasted">Paste the exported content (Markdown works best)</Label>
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

            {error && <p className="mt-3 text-sm text-danger">{error}</p>}
            {notice && <p className="mt-3 rounded-lg border border-accent/30 bg-accent-soft/40 p-3 text-sm text-accent-dark">{notice}</p>}

            {linkType !== "NOTION" && (
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
            <p className="mt-3 text-sm text-ink-soft">Choose a document from your connected account. Manage access in <a className="text-accent underline" href="/settings">Settings</a>.</p>
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
            {error && <p className="mt-3 text-sm text-danger">{error}</p>}
            <div className="mt-5 flex justify-end"><Button disabled={!selectedResource} loading={status === "processing"} onClick={() => void importCloudResource()}>Import document</Button></div>
          </>
        )}
      </div>
      {imageWarning && <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/35 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="image-import-title">
        <div className="card max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6 shadow-card-hover">
          <div className="flex items-start gap-3"><span className="rounded-full bg-accent-soft p-2 text-accent-dark"><AlertTriangle className="h-5 w-5" /></span><div><h2 id="image-import-title" className="font-display text-xl text-ink">Some image content could not be extracted</h2><p className="mt-1 text-sm text-ink-soft">Text embedded in images, scans, charts, or photographed pages may be missing. Nothing will be imported until you choose how to continue.</p></div></div>
          {imageWarning.errors.length > 0 && <ul className="mt-4 list-disc space-y-1 pl-5 text-xs text-danger">{imageWarning.errors.map((item) => <li key={item.filename}>{item.filename}: {item.error}</li>)}</ul>}
          {!showOcrHelp ? <div className="mt-6 grid gap-3 sm:grid-cols-2"><button onClick={() => { setImageWarning(null); void performFileImport(true); }} className="rounded-lg border border-line p-4 text-left hover:border-accent"><span className="block font-medium text-ink">Continue with partial text</span><span className="mt-1 block text-xs text-ink-soft">Import only the text Memoria could read.</span></button><button onClick={() => setShowOcrHelp(true)} className="rounded-lg border border-accent bg-accent-soft/30 p-4 text-left"><span className="block font-medium text-ink">Use an AI/OCR tool</span><span className="mt-1 block text-xs text-ink-soft">Copy a prepared prompt, then paste the completed extraction back.</span></button></div> : <div className="mt-5"><div className="flex items-center justify-between"><Label htmlFor="ocr-prompt">Extraction prompt</Label><button onClick={async () => { await navigator.clipboard.writeText(imageWarning.prompt); setPromptCopied(true); setTimeout(() => setPromptCopied(false), 1500); }} className="inline-flex items-center gap-1 text-xs font-medium text-accent-dark">{promptCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{promptCopied ? "Copied" : "Copy prompt"}</button></div><Textarea id="ocr-prompt" readOnly rows={7} value={imageWarning.prompt} className="mt-1 font-mono text-xs" /><div className="mt-4"><Label htmlFor="ocr-result">Paste the completed Markdown</Label><Textarea id="ocr-result" rows={8} value={ocrResult} onChange={(event) => setOcrResult(event.target.value)} placeholder="# Extracted lesson…" className="mt-1 font-mono text-sm" /></div></div>}
          <div className="mt-6 flex justify-end gap-2"><Button variant="ghost" onClick={() => { setImageWarning(null); setShowOcrHelp(false); }}>Cancel</Button>{showOcrHelp && <Button onClick={saveOcrResult} disabled={!ocrResult.trim()} loading={status === "processing"}>Save completed import</Button>}</div>
        </div>
      </div>}
    </div>
  );
}
