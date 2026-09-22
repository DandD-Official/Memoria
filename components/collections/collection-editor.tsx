"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, ChevronUp, ChevronDown, Pencil, Plus, Settings2, Share2, Trash2 } from "lucide-react";
import { MemoryPicker } from "./memory-picker";
import type { MemoryPickerRow, PickerMemory } from "@/lib/books/memory-picker";
import { BookShareDialog, type BookMember, type BookSharePermission } from "@/components/books/book-share-dialog";
import { BookPreview } from "@/components/books/book-preview";
import { ExportMenu } from "@/components/exports/export-menu";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { NotebookSubjects } from "@/components/books/notebook-subjects";
import { subjectOrder, type NotebookSubject } from "@/lib/books/notebooks";
import { Input, Label, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ExportProgressHandler } from "@/lib/export/types";

type ResourceType = "NOTE" | "REVIEWER" | "QUIZ";
interface CollectionItem { id: string; resourceType: ResourceType; resourceId: string; subjectId?: string | null }
interface Collection {
  kind?: "BOOK" | "NOTEBOOK"; subjects?: NotebookSubject[];
  id: string; title: string; subtitle: string | null; description: string | null; tocTitle: string;
  slug: string; isPublished: boolean; linkPermission: BookSharePermission; allowExport: boolean; expiresAt: string | null;
  passwordProtected: boolean; items: CollectionItem[]; members: BookMember[];
}
export function CollectionEditor({ initialCollection, access, canExport, rows, initiallyEditing = false }: { initiallyEditing?: boolean; initialCollection: Collection; access: "OWNER" | "EDIT"; canExport: boolean; rows: Record<ResourceType, MemoryPickerRow[]> }) {
  const router = useRouter();
  const [collection, setCollection] = useState(initialCollection);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [editing, setEditing] = useState(initiallyEditing);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [groupsOpen, setGroupsOpen] = useState(false);
  const [previewChapter, setPreviewChapter] = useState<string | undefined>();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(initialCollection.title);
  const [subtitle, setSubtitle] = useState(initialCollection.subtitle ?? "");
  const [description, setDescription] = useState(initialCollection.description ?? "");
  const [tocTitle, setTocTitle] = useState(initialCollection.tocTitle);
  const [saving, setSaving] = useState(false);
  const [activeSubjectId, setActiveSubjectId] = useState(initialCollection.subjects?.[0]?.id ?? "");
  const notebook = collection.kind === "NOTEBOOK";
  const label = notebook ? "Notebook" : "Book";
  const base = notebook ? "/notebooks" : "/books";
  const isOwner = access === "OWNER";
  const orderedItems = notebook ? subjectOrder(collection.items, collection.subjects ?? []) : collection.items;
  const activeSubject = collection.subjects?.find(subject => subject.id === activeSubjectId);
  const groupId = activeSubject?.id ?? "";
  const groupTitle = activeSubject?.title ?? "Unfiled";
  const visibleItems = notebook ? orderedItems.filter(item => (item.subjectId ?? "") === groupId) : orderedItems;
  const busy = saving || adding || busyId !== null;
  const groupTabs = [...(collection.subjects ?? []), { id: "", title: "Unfiled" }];
  const publicPath = `/c/${collection.slug}`;

  function rowFor(item: CollectionItem) { return rows[item.resourceType].find((row) => row.id === item.resourceId); }
  async function request(path: string, init: RequestInit) {
    const response = await fetch(path, init);
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.error ?? "Couldn't update this Book.");
    return data;
  }

  async function addMemory(memory: PickerMemory) {
    const data = await request(`/api/collections/${collection.id}/items`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resourceType: memory.resourceType, resourceId: memory.id, subjectId: notebook ? groupId || null : null }) });
    setCollection(current => ({ ...current, items: current.items.some(item => item.id === data.item.id) ? current.items : [...current.items, data.item] }));
  }
  async function removeMemory(item: CollectionItem) {
    setBusyId(item.id); setError(null);
    try {
      await request(`/api/collections/${collection.id}/items?itemId=${item.id}`, { method: "DELETE" });
      setCollection(current => ({ ...current, items: current.items.filter(row => row.id !== item.id) }));
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Couldn't remove this memory."); }
    finally { setBusyId(null); }
  }

  async function saveSubjects(subjects: NotebookSubject[]) {
    setSaving(true); setError(null);
    try {
      await request(`/api/collections/${collection.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subjects }) });
      setCollection(current => ({ ...current, subjects, items: current.items.map(item => ({ ...item, subjectId: subjects.some(subject => subject.id === item.subjectId) ? item.subjectId : null })) }));
      const created = subjects.find(subject => !collection.subjects?.some(previous => previous.id === subject.id));
      if (created) { setActiveSubjectId(created.id); setPreviewChapter(undefined); }
      else if (activeSubjectId && !subjects.some(subject => subject.id === activeSubjectId)) setActiveSubjectId(subjects[0]?.id ?? "");
      return true;
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Couldn't save titles."); return false; }
    finally { setSaving(false); }
  }
  async function moveItem(itemId: string, direction: -1 | 1) {
    const index = orderedItems.findIndex((item) => item.id === itemId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= collection.items.length) return;
    if (busy || (notebook && (orderedItems[index].subjectId ?? "") !== (orderedItems[target].subjectId ?? ""))) return;
    setBusyId(itemId); setError(null);
    const previous = collection.items;
    const next = [...orderedItems];
    [next[index], next[target]] = [next[target], next[index]];
    setCollection((current) => ({ ...current, items: next }));
    try { await request(`/api/collections/${collection.id}/items`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemIds: next.map((item) => item.id) }) }); }
    catch (caught) { setCollection((current) => ({ ...current, items: previous })); setError(caught instanceof Error ? caught.message : "Couldn't reorder this Book."); }
    finally { setBusyId(null); }
  }

  async function saveDetails() {
    if (!title.trim() || !tocTitle.trim()) { setError("A title and contents heading are required."); return false; }
    setSaving(true); setError(null);
    try {
      const data = await request(`/api/collections/${collection.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: title.trim(), subtitle: subtitle.trim() || null, description: description.trim(), tocTitle: tocTitle.trim() }) });
      setCollection((current) => ({ ...current, title: data.collection.title, subtitle: data.collection.subtitle, description: data.collection.description, tocTitle: data.collection.tocTitle }));
      return true;
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Couldn't save Book details."); return false; }
    finally { setSaving(false); }
  }

  async function exportBook(format: string, onProgress?: ExportProgressHandler) {
    if (format === "json") { window.location.href = `/api/collections/${collection.id}/export?format=json`; return; }
    const response = await fetch(`/api/collections/${collection.id}/export`);
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.error ?? "Couldn't export this Book.");
    if (format === "pdf" || format === "docx") { const { downloadBook } = await import("@/lib/books/download"); await downloadBook(data.book, format, onProgress); }
  }

  async function deleteBook() {
    try { await request(`/api/collections/${collection.id}`, { method: "DELETE" }); router.replace(base); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Couldn't delete this Book."); }
  }

  const detailsChanged = title.trim() !== collection.title || subtitle.trim() !== (collection.subtitle ?? "") || description.trim() !== (collection.description ?? "") || tocTitle.trim() !== collection.tocTitle;
  async function finishEditing() {
    if (busy) return;
    if (detailsChanged && !(await saveDetails())) return;
    setEditing(false); setPickerOpen(false); setPreviewChapter(undefined);
  }
  function selectGroup(id: string) { setActiveSubjectId(id); setPreviewChapter(undefined); }

  return (
    <div className="mx-auto max-w-[1500px] px-3 py-6 pb-10 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href={base} className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-ink-soft hover:text-ink"><ArrowLeft aria-hidden="true" className="h-4 w-4" />All {label.toLowerCase()}s</Link>
        <div className="flex flex-wrap items-center gap-2">
          {canExport && <ExportMenu label="Download" options={[{ value: "pdf", label: "PDF document" }, { value: "docx", label: "Word document" }, { value: "json", label: "Memoria JSON" }]} onExport={exportBook} />}
          {isOwner && <Button variant="outline" size="sm" onClick={() => setShareOpen(true)}><Share2 className="h-4 w-4" />Share</Button>}
          <Button disabled={busy} onClick={() => editing ? void finishEditing() : setEditing(true)}>{editing ? <Check className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}{editing ? "Done" : "Edit"}</Button>
        </div>
      </div>
      <header className="mb-6 space-y-3">
        {editing && <h1 className="sr-only">Edit {collection.title}</h1>}
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-dark">{editing ? "Editing " : ""}{label}</p>
        {editing ? <div className="flex flex-wrap items-end gap-3"><div className="min-w-0 flex-1"><Label htmlFor="book-title" className="sr-only">{label} title</Label><Input id="book-title" maxLength={200} value={title} disabled={busy} onChange={event => setTitle(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); void finishEditing(); } }} className="h-auto min-h-14 bg-transparent py-2 font-display text-3xl sm:text-4xl" /></div><Button variant="outline" disabled={busy} onClick={() => setDetailsOpen(true)}><Settings2 className="h-4 w-4" />Cover details</Button></div> : <h1 className="break-words font-display text-3xl sm:text-4xl">{collection.title}</h1>}
        {editing ? <p role="status" className="text-xs text-ink-soft">{busy ? "Saving changes..." : detailsChanged ? "Title and cover changes will save when you choose Done." : "Memories and groups save as you edit."}</p> : collection.subtitle && <p className="text-ink-soft">{collection.subtitle}</p>}
      </header>
      {error && <p role="alert" className="mb-4 rounded-control border border-danger/25 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</p>}
      {editing && notebook && <div className="mb-5 flex flex-wrap items-center gap-3">
        <div role="tablist" aria-label="Notebook groups" className="flex min-w-0 flex-1 flex-wrap gap-2">
          {groupTabs.map((group, index) => <button key={group.id} type="button" role="tab" id={"notebook-group-tab-" + index} aria-controls="notebook-group-panel" aria-selected={group.id === groupId} tabIndex={group.id === groupId ? 0 : -1} disabled={busy} onClick={() => selectGroup(group.id)} onKeyDown={event => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
            event.preventDefault();
            const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
            const step = (event.key === "ArrowRight" ? 1 : -1) * (rtl ? -1 : 1);
            const next = event.key === "Home" ? 0 : event.key === "End" ? groupTabs.length - 1 : (index + step + groupTabs.length) % groupTabs.length;
            selectGroup(groupTabs[next].id); document.getElementById("notebook-group-tab-" + next)?.focus();
          }} className={cn("flex min-h-11 max-w-full items-center gap-2 rounded-control border px-4 py-2 text-start text-sm font-medium disabled:opacity-50", group.id === groupId ? "border-accent bg-accent-soft text-ink" : "border-line bg-surface text-ink-soft hover:border-accent")}><span className="break-words">{group.title}</span><span className="shrink-0 text-xs text-ink-faint">{collection.items.filter(item => (item.subjectId ?? "") === group.id).length}</span></button>)}
        </div>
        <Button variant="outline" disabled={busy} onClick={() => setGroupsOpen(true)}><Plus className="h-4 w-4" />Groups</Button>
      </div>}
      <div id={editing && notebook ? "notebook-group-panel" : undefined} role={editing && notebook ? "tabpanel" : undefined} aria-labelledby={editing && notebook ? "notebook-group-tab-" + groupTabs.findIndex(group => group.id === groupId) : undefined} className={editing ? "grid items-start gap-6 min-[1100px]:grid-cols-[280px_minmax(0,1fr)]" : "min-w-0"}>
        {editing && <aside aria-label="Edit contents" className="min-w-0 rounded-card border border-line bg-surface p-4 min-[1100px]:sticky min-[1100px]:top-24">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{notebook ? "This group" : "Contents"}</p>
          <h2 className="mt-2 break-words font-display text-xl">{notebook ? groupTitle : "Your chapters"}</h2>
          <p className="mt-2 text-xs text-ink-soft">{visibleItems.length} {visibleItems.length === 1 ? "memory" : "memories"}. Select one to see its pages.</p>
          {isOwner && <Button className="mt-4 w-full" disabled={busy} onClick={() => setPickerOpen(true)}><Plus className="h-4 w-4" />Add memories</Button>}
          {!visibleItems.length && <div className="my-6 rounded-control border border-dashed border-line-strong p-4 text-sm text-ink-soft">{isOwner ? "Start this section with a few memories from your library." : "No memories in this section yet."}</div>}
          <ol className="mt-4 max-h-[45dvh] space-y-2 overflow-y-auto" aria-label="Memories in reading order">{visibleItems.map((item, index) => <li key={item.id} className={cn("rounded-control border p-2", previewChapter === item.id ? "border-accent bg-accent-soft" : "border-line")}>
            <button type="button" disabled={busy} aria-pressed={previewChapter === item.id} onClick={() => setPreviewChapter(item.id)} className="flex min-h-11 w-full items-start gap-2 py-2 text-start text-sm"><span className="text-ink-faint">{String(index + 1).padStart(2, "0")}</span><span className="min-w-0 break-words font-medium">{rowFor(item)?.title ?? "Unavailable memory"}</span></button>
            <div className="flex justify-end gap-1"><Button variant="ghost" size="sm" disabled={busy || index === 0} aria-label={"Move " + (rowFor(item)?.title ?? "memory") + " up"} onClick={() => void moveItem(item.id, -1)}><ChevronUp className="h-4 w-4" /></Button><Button variant="ghost" size="sm" disabled={busy || index === visibleItems.length - 1} aria-label={"Move " + (rowFor(item)?.title ?? "memory") + " down"} onClick={() => void moveItem(item.id, 1)}><ChevronDown className="h-4 w-4" /></Button><Button variant="ghost" size="sm" disabled={busy} aria-label={"Remove " + (rowFor(item)?.title ?? "memory") + " from " + label.toLowerCase()} onClick={() => void removeMemory(item)}><Trash2 className="h-4 w-4" /></Button></div>
          </li>)}</ol>
        </aside>}
        <section aria-label={label + " pages"} className="min-w-0">
          {editing && notebook && <div className="mb-4">
            {activeSubject ? <><Label htmlFor="active-group-title">Group title</Label><Input key={activeSubject.id + activeSubject.title} id="active-group-title" defaultValue={activeSubject.title} maxLength={120} disabled={busy} className="h-auto py-2 font-display text-2xl" onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }} onBlur={event => {
              const input = event.currentTarget; const value = input.value.trim();
              if (!value) { input.value = activeSubject.title; return; }
              if (value !== activeSubject.title) void saveSubjects((collection.subjects ?? []).map(subject => subject.id === groupId ? { ...subject, title: value } : subject)).then(saved => { if (!saved) input.value = activeSubject.title; });
            }} /></> : <p className="font-display text-2xl">Unfiled</p>}
          </div>}
          <BookPreview id={collection.id} revision={JSON.stringify([collection.title, collection.subtitle, collection.description, collection.tocTitle, collection.subjects, collection.items])} editing={editing} subjectId={editing && notebook ? groupId : undefined} chapterId={previewChapter} updating={adding} />
          {editing && isOwner && <button type="button" disabled={busy} onClick={() => setPickerOpen(true)} className="mt-5 flex min-h-20 w-full flex-wrap items-center justify-center gap-2 rounded-card border-2 border-dashed border-line-strong bg-surface p-4 text-sm font-medium hover:border-accent hover:bg-accent-soft disabled:opacity-50"><Plus className="h-5 w-5" />Add memories to {notebook ? groupTitle : collection.title}</button>}
        </section>
      </div>
      <Dialog open={pickerOpen} onOpenChange={open => { if (!adding) setPickerOpen(open); }} title={"Add memories to " + (notebook ? groupTitle : collection.title)} description="Choose from your library. Memories are added directly to this section." className="sm:max-w-5xl" footer={<Button disabled={adding} variant="outline" onClick={() => setPickerOpen(false)}>Back to {label.toLowerCase()}</Button>}>
        <MemoryPicker key={notebook ? groupId : collection.id} rows={rows} included={collection.items} destinationTitle={notebook ? groupTitle : collection.title} disabled={saving || busyId !== null} onAdd={addMemory} onBusyChange={setAdding} />
      </Dialog>
      <Dialog open={groupsOpen} onOpenChange={open => { if (!busy) setGroupsOpen(open); }} title="Notebook groups" description="Create a group to collect related memories, or rename and arrange your existing groups." footer={<Button disabled={busy} onClick={() => setGroupsOpen(false)}>Done</Button>}>
        <NotebookSubjects subjects={collection.subjects ?? []} busy={busy} save={saveSubjects} />
        {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
      </Dialog>
      <Dialog open={detailsOpen} onOpenChange={open => { if (!busy) setDetailsOpen(open); }} title={label + " cover details"} description="These words appear on the cover and contents pages." footer={<Button disabled={busy || !title.trim() || !tocTitle.trim()} loading={saving} onClick={async () => { if (await saveDetails()) setDetailsOpen(false); }}>Save details</Button>}>
        <div className="space-y-4"><div><Label htmlFor="book-subtitle">Subtitle</Label><Input id="book-subtitle" maxLength={240} value={subtitle} onChange={event => setSubtitle(event.target.value)} /></div><div><Label htmlFor="book-toc-title">Contents heading</Label><Input id="book-toc-title" maxLength={80} value={tocTitle} onChange={event => setTocTitle(event.target.value)} /></div><div><Label htmlFor="book-description">Description</Label><Textarea id="book-description" rows={4} maxLength={2000} value={description} onChange={event => setDescription(event.target.value)} /></div></div>
        {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
        {isOwner && <div className="mt-6 border-t border-line pt-4"><ConfirmDialog trigger={<Button disabled={busy} variant="ghost" className="text-danger"><Trash2 className="h-4 w-4" />Delete {label.toLowerCase()}</Button>} title={"Delete this " + label.toLowerCase() + "?"} description={"The collection and its reading order will be removed. Your original memories will remain in your library."} confirmLabel={"Delete " + label.toLowerCase()} destructive onConfirm={deleteBook} /></div>}
      </Dialog>
      {isOwner && <BookShareDialog objectLabel={label} bookId={collection.id} publicPath={publicPath} open={shareOpen} onOpenChange={setShareOpen} linkEnabled={collection.isPublished} linkPermission={collection.linkPermission} linkAllowExport={collection.allowExport} passwordProtected={collection.passwordProtected} members={collection.members} onChanged={(changes) => setCollection((current) => ({ ...current, ...(changes.linkEnabled === undefined ? {} : { isPublished: changes.linkEnabled }), ...(changes.linkPermission === undefined ? {} : { linkPermission: changes.linkPermission }), ...(changes.linkAllowExport === undefined ? {} : { allowExport: changes.linkAllowExport }), ...(changes.passwordProtected === undefined ? {} : { passwordProtected: changes.passwordProtected }), ...(changes.members === undefined ? {} : { members: changes.members }) }))} />}
    </div>
  );
}
