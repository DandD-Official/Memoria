"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock3, FileText, Plus, Share2, Trash2, Download, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { LoadingState } from "@/components/ui/loading-state";
import { toast } from "@/components/ui/toast";
import { WorkspaceNoteEditor } from "./note-editor";
import type { WorkspaceAction, WorkspaceData, WorkspaceNoteData } from "@/lib/workspaces/schema";

export function WorkspaceDetail({ id }: { id: string }) {
  const router = useRouter();
  const [data, setData] = useState<WorkspaceData | null>(null);
  const dataRef = useRef<WorkspaceData | null>(null);
  const [active, setActive] = useState("");
  const [error, setError] = useState("");
  const [unavailable, setUnavailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState("EDIT");
  const [noteTitle, setNoteTitle] = useState("");
  const [now, setNow] = useState(Date.now());
  const draftState = useRef({ dirty: false, saving: false });
  const requestNumber = useRef(0);
  const inFlight = useRef<AbortController | null>(null);
  const terminal = useRef(false);
  const onDraftState = useCallback((dirty: boolean, saving: boolean) => { draftState.current = { dirty, saving }; }, []);
  const refresh = useCallback(async (force = false) => {
    if (!force && (inFlight.current || terminal.current)) return;
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;
    const number = ++requestNumber.current;
    try {
      const response = await fetch(`/api/workspaces/${id}`, { headers: !force && dataRef.current ? { "If-None-Match": `"${dataRef.current.version}"` } : {}, cache: "no-store", signal: controller.signal });
      if (number !== requestNumber.current) return;
      if (response.status === 304) { setError(""); return; }
      const next = await response.json();
      if (!response.ok) { if ([401, 403, 404, 410].includes(response.status)) { terminal.current = true; setUnavailable(true); } throw new Error(next.error); }
      if (dataRef.current && next.version < dataRef.current.version) return;
      dataRef.current = next; terminal.current = false; setData(next); setUnavailable(false); setError("");
      setActive(value => value || next.notes[0]?.id || "");
    } catch (error) { if (!controller.signal.aborted && number === requestNumber.current) setError(error instanceof Error ? error.message : "Connection interrupted. Your draft is still here. Retry syncing."); }
    finally { if (inFlight.current === controller) inFlight.current = null; }
  }, [id]);
  useEffect(() => {
    const sequence = requestNumber;
    const requests = inFlight;
    void refresh(true);
    const timer = window.setInterval(() => { setNow(Date.now()); if (!document.hidden) void refresh(); }, 5000);
    const focus = () => void refresh();
    window.addEventListener("focus", focus);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", focus); sequence.current++; requests.current?.abort(); };
  }, [refresh]);
  const expired = Boolean(data && now >= new Date(data.expiresAt).getTime());
  const editable = Boolean(data && data.permission !== "VIEW" && !unavailable && !expired);
  const owner = data?.permission === "OWNER";
  const selected = data?.notes.find(note => note.id === active);
  // Keep the selected editor mounted if someone removes its note, so the local
  // draft can still be downloaded rather than silently discarded.
  const lastSelected = useRef<WorkspaceNoteData | null>(null);
  if (selected) lastSelected.current = selected;
  const currentNote = selected ?? (lastSelected.current?.id === active ? lastSelected.current : null);
  const onSaved = useCallback((note: WorkspaceNoteData) => {
    setData(current => current ? { ...current, notes: current.notes.map(item => item.id === note.id && item.version <= note.version ? note : item) } : current);
    void refresh(true);
  }, [refresh]);

  async function mutate(action: WorkspaceAction) {
    setBusy(true);
    try {
      const response = await fetch(`/api/workspaces/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(action) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error);
      await refresh(true); return result;
    } catch (error) { toast(error instanceof Error ? error.message : "Could not make this change. Please try again.", "error"); return null; }
    finally { setBusy(false); }
  }
  function canSwitch() {
    if (draftState.current.saving) { toast("Wait for the current save to finish.", "error"); return false; }
    return !draftState.current.dirty || window.confirm("Discard the unsaved changes in this note before switching?");
  }
  async function exportNotes() {
    if (!data) return;
    setBusy(true);
    try {
      const { default: JSZip } = await import("jszip"); const zip = new JSZip();
      data.notes.forEach((note, index) => zip.file(`${index + 1}-${note.title.replace(/[^a-z0-9 _-]/gi, "_").slice(0, 80)}.md`, note.content));
      const blob = await zip.generateAsync({ type: "blob" }); const url = URL.createObjectURL(blob);
      const link = document.createElement("a"); link.href = url; link.download = "memoria-workspace.zip"; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast("Saved notes exported. Unsaved drafts can be downloaded separately.");
    } catch { toast("Export failed. Try downloading individual notes.", "error"); } finally { setBusy(false); }
  }
  if (!data) return error ? <div role="alert" className="space-y-4"><p>{error}</p><Button onClick={() => void refresh(true)}>Retry</Button><Link href="/workspaces" className="journal-link">Back to workspaces</Link></div> : <LoadingState label="Opening your shared workspace" variant="document" />;

  return <div className="space-y-6">
    <Link href="/workspaces" className="journal-link"><ArrowLeft className="h-4 w-4" />All workspaces</Link>
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-6"><div className="min-w-0"><p className="eyebrow">Shared workspace</p><h1 className="mt-3 break-words font-display text-3xl">{data.title}</h1><p className="mt-2 text-xs text-ink-soft">{data.permission === "OWNER" ? "You own this workspace" : data.permission === "EDIT" ? "You can edit" : "Read-only access"} · Saved changes sync every five seconds</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy} onClick={() => void exportNotes()}><Download className="h-4 w-4" />Export saved notes</Button><Button variant="outline" onClick={() => setSharing(true)}><Share2 className="h-4 w-4" />People & sharing</Button>{owner && <ConfirmDialog trigger={<Button variant="ghost" disabled={unavailable || expired}><Trash2 className="h-4 w-4" />Delete workspace</Button>} title="Delete this workspace for everyone?" description="All its notes and sharing permissions will be permanently removed. Export anything you need first." destructive onConfirm={async () => { const response = await fetch(`/api/workspaces/${id}`, { method: "DELETE" }); if (!response.ok) throw new Error("Could not delete workspace"); toast("Workspace deleted."); router.replace("/workspaces"); }} />}</div></header>
    <div className="flex gap-3 rounded-control border border-line bg-accent-soft p-4 text-sm"><Clock3 className="h-5 w-5 shrink-0" /><p>{expired ? "This workspace has expired. Download any draft still on this screen." : <>Expires <strong>{new Date(data.expiresAt).toLocaleString()}</strong> ({Math.max(1, Math.ceil((new Date(data.expiresAt).getTime() - now) / 3_600_000))} hours remaining). Export before then; editing does not extend this deadline.</>}</p></div>
    {error && <p role="alert" className="text-sm text-danger">{error} {!unavailable && <button onClick={() => void refresh(true)} className="underline">Retry sync</button>}</p>}
    <div className="grid items-start gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]"><aside className="space-y-4 rounded-card border border-line bg-surface p-4"><h2 className="text-sm font-semibold">Notes · {data.notes.length}/20</h2><nav aria-label="Workspace notes" className="space-y-1">{data.notes.map(note => <button key={note.id} onClick={() => { if (note.id !== active && canSwitch()) { draftState.current = { dirty: false, saving: false }; setActive(note.id); } }} aria-current={note.id === active ? "page" : undefined} className={`flex min-h-11 w-full items-center gap-2 rounded-control px-3 py-2 text-left text-sm transition-colors ${note.id === active ? "bg-accent-soft font-semibold" : "hover:bg-surface-muted"}`}><FileText className="h-4 w-4 shrink-0" /><span className="break-words">{note.title}</span></button>)}</nav>{editable && <form onSubmit={async event => { event.preventDefault(); if (!canSwitch()) return; const result = await mutate({ action: "add-note", title: noteTitle }); if (result) { setActive(result.id); setNoteTitle(""); toast("Note added."); } }} className="border-t border-line pt-4"><Label htmlFor="new-workspace-note">New note</Label><Input id="new-workspace-note" required maxLength={150} value={noteTitle} onChange={event => setNoteTitle(event.target.value)} placeholder="Note title" /><Button type="submit" variant="outline" className="mt-2 w-full" loading={busy} disabled={data.notes.length >= 20 || !noteTitle.trim()}><Plus className="h-4 w-4" />Add note</Button></form>}</aside>
    <section className="min-w-0 rounded-card border border-line bg-surface p-4 sm:p-6" aria-label="Note editor">{currentNote ? <>{!selected && <p role="alert" className="mb-4 text-sm text-danger">This note was removed by a collaborator. Download your draft to keep it.</p>}<WorkspaceNoteEditor key={currentNote.id} workspaceId={id} note={currentNote} canEdit={editable && Boolean(selected)} onSaved={onSaved} onDraftState={onDraftState} />{editable && selected && <div className="mt-6 border-t border-line pt-4"><ConfirmDialog trigger={<Button variant="ghost" size="sm" disabled={busy}><Trash2 className="h-4 w-4" />Delete note</Button>} title="Delete this note for everyone?" description="This removes the saved note and any unsaved changes here. Download a copy first if you need it." destructive onConfirm={async () => { if (draftState.current.saving) throw new Error("Wait for saving to finish"); const result = await mutate({ action: "delete-note", noteId: selected.id, version: selected.version }); if (!result) throw new Error("Delete failed"); lastSelected.current = null; setActive(data.notes.find(note => note.id !== selected.id)?.id || ""); toast("Note deleted."); }} /></div>}</> : <div className="py-12 text-center"><h2 className="font-display text-2xl">Start with a note</h2><p className="mt-2 text-sm text-ink-soft">Add a note from the sidebar to begin.</p></div>}</section></div>
    <Dialog open={sharing} onOpenChange={setSharing} title="People & sharing" description="Only the owner and invited Memoria accounts can open this workspace. Sending its URL alone does not grant access." className="overflow-y-auto"><div className="space-y-5"><Button variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(location.href); toast("Workspace link copied. Invite people below to grant access."); } catch { toast("Copy the workspace URL from your address bar.", "error"); } }}>Copy workspace link</Button>{owner && !unavailable && !expired && <form className="space-y-3" onSubmit={async event => { event.preventDefault(); const result = await mutate({ action: "invite", email, permission: permission as "EDIT" | "VIEW" }); if (result) { setEmail(""); toast("Workspace access updated. Send them the link to get started."); } }}><div><Label htmlFor="workspace-email">Collaborator&apos;s account email</Label><Input id="workspace-email" type="email" required value={email} onChange={event => setEmail(event.target.value)} /></div><div><Label htmlFor="workspace-permission">Access</Label><select id="workspace-permission" className="min-h-11 w-full rounded-control border border-line bg-surface px-3 text-sm" value={permission} onChange={event => setPermission(event.target.value)}><option value="EDIT">Can edit notes</option><option value="VIEW">Can view and export</option></select></div><Button loading={busy} type="submit">Grant access</Button></form>}<div><h3 className="text-sm font-semibold">Collaborators</h3>{data.members.length === 0 && <p className="mt-2 text-sm text-ink-soft">No collaborators yet.</p>}{data.members.map(member => <div key={member.userId} className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3"><div className="min-w-0"><p className="break-words text-sm">{member.user.name}</p><p className="break-all text-xs text-ink-soft">{member.user.email} · {member.permission === "EDIT" ? "Editor" : "Viewer"}</p></div>{owner && <Button variant="ghost" size="sm" disabled={busy || unavailable || expired} onClick={async () => { if (await mutate({ action: "revoke", userId: member.userId })) toast("Access removed."); }}>Remove</Button>}</div>)}</div></div></Dialog>
  </div>;
}
