"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { MarkdownEditor } from "@/components/markdown/editor";
import { MarkdownRenderer } from "@/components/markdown/renderer";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast";
import { SvgHelper } from "./svg-helper";
import { MAX_NOTE_CHARS, type WorkspaceNoteData } from "@/lib/workspaces/schema";

export function downloadText(title: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/markdown;charset=utf-8" }));
  const link = document.createElement("a"); link.href = url; link.download = `${title.replace(/[^a-z0-9 _-]/gi, "_").slice(0, 100) || "note"}.md`; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function WorkspaceNoteEditor({ workspaceId, note, canEdit, onSaved, onDraftState }: { workspaceId: string; note: WorkspaceNoteData; canEdit: boolean; onSaved: (note: WorkspaceNoteData) => void; onDraftState: (dirty: boolean, saving: boolean) => void }) {
  const [baseline, setBaseline] = useState(note);
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState<WorkspaceNoteData | null>(null);
  const [autoSave, setAutoSave] = useState(true);
  const pending = useRef(false);
  const dirty = title !== baseline.title || content !== baseline.content;

  useEffect(() => { onDraftState(dirty, saving); }, [dirty, saving, onDraftState]);
  useEffect(() => {
    if (note.version <= baseline.version) return;
    if (dirty || saving) setConflict(note);
    else { setBaseline(note); setTitle(note.title); setContent(note.content); }
  }, [note, baseline.version, dirty, saving]);
  useEffect(() => {
    if (!dirty) return;
    const guard = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", guard);
    // Preserve drafts on same-tab navigation too; full reload warning is native.
    const click = (event: MouseEvent) => {
      const anchor = (event.target as Element).closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download") || anchor.href === location.href || event.ctrlKey || event.metaKey) return;
      if (!window.confirm("This note has unsaved changes. Leave and discard them?")) { event.preventDefault(); event.stopPropagation(); }
    };
    document.addEventListener("click", click, true);
    return () => { window.removeEventListener("beforeunload", guard); document.removeEventListener("click", click, true); };
  }, [dirty]);

  const save = useCallback(async (manual = false) => {
    if (pending.current || !canEdit || !dirty || conflict) return;
    if (!title.trim() || content.length > MAX_NOTE_CHARS) { setError("Add a title and keep the note below 100,000 characters."); return; }
    pending.current = true; setSaving(true); setError("");
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save-note", noteId: note.id, title, content, version: baseline.version }) });
      const result = await response.json();
      if (!response.ok) { if (result.currentNote) setConflict(result.currentNote); throw new Error(result.error); }
      // Keep any text typed during the request. The returned version belongs to
      // this exact save, never to a subsequent collaborator's update.
      setBaseline(result); setTitle(current => current === title ? result.title : current);
      setConflict(current => current && current.version > result.version ? current : null);
      onSaved(result);
      if (manual) toast("Note saved.");
    } catch (error) { setError(error instanceof Error ? error.message : "Could not save. Your draft is still here; try again."); }
    finally { pending.current = false; setSaving(false); }
  }, [workspaceId, note.id, title, content, baseline.version, canEdit, dirty, conflict, onSaved]);
  useEffect(() => {
    if (!autoSave || !dirty || saving || conflict || error || !canEdit) return;
    const timer = window.setTimeout(() => void save(), 1200);
    return () => window.clearTimeout(timer);
  }, [autoSave, dirty, saving, conflict, error, canEdit, save]);

  function loadVersion(next: WorkspaceNoteData) { setTitle(next.title); setContent(next.content); setBaseline(next); setConflict(null); setError(""); toast("Draft replaced with the saved version."); }
  return <div className="min-w-0 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><p role="status" className="text-xs text-ink-soft">{saving ? "Saving…" : conflict ? "Newer version needs your review" : error ? "Not saved — your draft is still here" : dirty ? "Unsaved changes" : "All changes saved"}</p><div className="flex flex-wrap items-center gap-3"><Button variant="ghost" size="sm" onClick={() => downloadText(title, content)}>Download this draft</Button>{canEdit && <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={autoSave} onChange={event => setAutoSave(event.target.checked)} />Auto-save</label>}</div></div>
    {error && <p role="alert" className="rounded-control border border-danger/30 p-3 text-sm text-danger">{error}</p>}
    {conflict && <section className="space-y-3 rounded-card border border-line-strong bg-accent-soft p-4"><h3 className="font-semibold">A collaborator saved a newer version</h3><p className="text-sm">Your draft is preserved below. Compare it with the saved text. You can download your draft, load their version, or keep editing your draft and explicitly save a merged version.</p><details><summary className="cursor-pointer text-sm">View saved version: {conflict.title}</summary><pre className="mt-3 max-h-60 overflow-auto whitespace-pre-wrap break-words rounded-control bg-surface p-3 text-xs">{conflict.content}</pre></details><div className="flex flex-wrap gap-2"><ConfirmDialog trigger={<Button variant="outline" size="sm">Load saved version</Button>} title="Discard your draft?" description="This replaces your unsaved text with the collaborator's saved version. Download your draft first if you want to keep it." onConfirm={() => loadVersion(conflict)} /><Button size="sm" onClick={() => { setBaseline(conflict); setConflict(null); setError(""); setAutoSave(false); toast("Your draft is kept. Merge the changes, then choose Save."); }}>Keep draft and merge manually</Button></div></section>}
    {canEdit ? <><div><Label htmlFor="workspace-note-title">Note title</Label><Input id="workspace-note-title" value={title} maxLength={150} onChange={event => setTitle(event.target.value)} /></div><div className="flex flex-wrap items-center justify-between gap-3"><SvgHelper context={content} onInsert={result => setContent(value => `${value}\n\n${result}`.trim())} /><span className={`text-xs ${content.length > MAX_NOTE_CHARS ? "text-danger" : "text-ink-faint"}`}>{content.length.toLocaleString()} / 100,000 characters</span></div><MarkdownEditor value={content} onChange={setContent} minRows={24} /><div className="flex flex-wrap justify-end gap-2"><ConfirmDialog trigger={<Button variant="ghost" disabled={!dirty || saving}>Discard changes</Button>} title="Discard unsaved changes?" description="Return to the latest saved version of this note." onConfirm={() => loadVersion(conflict ?? baseline)} /><Button loading={saving} disabled={!dirty || Boolean(conflict)} onClick={() => void save(true)}>Save changes</Button></div></> : <><h2 className="break-words font-display text-2xl">{title}</h2><p className="text-xs text-ink-soft">Read-only. Saved updates appear automatically.</p><MarkdownRenderer content={content} /></>}
  </div>;
}
