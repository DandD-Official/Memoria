"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen, ChevronUp, ChevronDown, Plus, Settings2, Share2, Trash2 } from "lucide-react";
import { MemoryPicker } from "./memory-picker";
import type { MemoryPickerRow, PickerMemory } from "@/lib/books/memory-picker";
import { BookShareDialog, type BookMember, type BookSharePermission } from "@/components/books/book-share-dialog";
import { BookPreview } from "@/components/books/book-preview";
import { ExportMenu } from "@/components/exports/export-menu";
import { Badge } from "@/components/ui/badge";
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
export function CollectionEditor({ initialCollection, access, canExport, rows }: { initialCollection: Collection; access: "OWNER" | "EDIT"; canExport: boolean; rows: Record<ResourceType, MemoryPickerRow[]> }) {
  const router = useRouter();
  const [collection, setCollection] = useState(initialCollection);
  const [pickerOpen, setPickerOpen] = useState(!initialCollection.items.length);
  const [adding, setAdding] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [view, setView] = useState<"book" | "chapters">(initialCollection.items.length ? "book" : "chapters");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(initialCollection.title);
  const [subtitle, setSubtitle] = useState(initialCollection.subtitle ?? "");
  const [description, setDescription] = useState(initialCollection.description ?? "");
  const [tocTitle, setTocTitle] = useState(initialCollection.tocTitle);
  const [saving, setSaving] = useState(false);
  const [activeSubjectId, setActiveSubjectId] = useState(initialCollection.subjects?.[0]?.id ?? "");
  const [newGroupTitle, setNewGroupTitle] = useState("");
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
      if (created) { setActiveSubjectId(created.id); setPickerOpen(true); }
      else if (activeSubjectId && !subjects.some(subject => subject.id === activeSubjectId)) setActiveSubjectId(subjects[0]?.id ?? "");
      return true;
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Couldn't save titles."); return false; }
    finally { setSaving(false); }
  }
  async function createGroup() {
    const name = newGroupTitle.trim();
    if (!name || busy || (collection.subjects?.length ?? 0) >= 50) return;
    if (await saveSubjects([...(collection.subjects ?? []), { id: crypto.randomUUID(), title: name }])) setNewGroupTitle("");
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
    if (!title.trim() || !tocTitle.trim()) return;
    setSaving(true); setError(null);
    try {
      const data = await request(`/api/collections/${collection.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: title.trim(), subtitle: subtitle.trim() || null, description: description.trim(), tocTitle: tocTitle.trim() }) });
      setCollection((current) => ({ ...current, title: data.collection.title, subtitle: data.collection.subtitle, description: data.collection.description, tocTitle: data.collection.tocTitle }));
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Couldn't save Book details."); }
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

  return (
    <div className="mx-auto max-w-[1500px] px-3 py-6 sm:px-6 pb-10">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link href={base} className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-ink-soft hover:text-ink"><ArrowLeft className="h-4 w-4" />All {label}s</Link>
        <div className="flex items-center gap-2">
          {canExport && <ExportMenu label="Download" options={[{ value: "pdf", label: "PDF document" }, { value: "docx", label: "Word - editable text" }, { value: "json", label: "Memoria JSON" }]} onExport={exportBook} />}
          {isOwner && <Button size="sm" onClick={() => setShareOpen(true)}><Share2 className="h-4 w-4" />Share</Button>}
        </div>
      </div>

      <header className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-dark">{label} studio</p><h1 className="mt-1 font-display text-3xl text-ink">{collection.title}</h1>{collection.subtitle && <p className="mt-1 text-sm text-ink-soft">{collection.subtitle}</p>}</div>
        <Badge tone={isOwner ? "accent" : "neutral"}>{isOwner ? "Owner" : "Editor"}</Badge>
      </header>
      {error && <p className="mb-4 rounded-control border border-danger/25 bg-danger/5 px-4 py-3 text-sm text-danger" role="alert">{error}</p>}

      <nav aria-label="Book studio sections" className="mb-5 flex w-full gap-1 overflow-x-auto rounded-card border border-line bg-surface-muted p-1 sm:w-fit">
        {[
          { key: "book" as const, label, icon: BookOpen },
          { key: "chapters" as const, label: notebook ? "Groups & details" : "Chapters & details", icon: Settings2 },
        ].map((item) => <button key={item.key} type="button" aria-current={view === item.key ? "page" : undefined} disabled={busy} onClick={() => setView(item.key)} className={cn("inline-flex min-h-10 shrink-0 items-center gap-2 rounded-control px-4 text-sm font-medium transition-colors", view === item.key ? "bg-surface text-ink shadow-sm" : "text-ink-soft hover:text-ink")}><item.icon className="h-4 w-4" />{item.label}</button>)}
      </nav>

      {view === "book" && <BookPreview id={collection.id} revision={JSON.stringify([collection.title, collection.subtitle, collection.description, collection.tocTitle, collection.subjects, collection.items])} />}

      {view === "chapters" && <section className="rounded-card border border-line bg-surface p-5 shadow-sm">
        <details className="mb-6 rounded-control border border-line p-4">
          <summary className="cursor-pointer text-sm font-medium">{label} details</summary>
          <div className="mt-5 max-w-2xl">
        <h2 className="font-display text-xl text-ink">{label} details</h2><p className="mt-1 text-sm text-ink-soft">These words appear on the cover and opening pages.</p>
        <div className="mt-5 space-y-4"><div><Label htmlFor="book-title">Title</Label><Input id="book-title" value={title} onChange={(event) => setTitle(event.target.value)} /></div><div><Label htmlFor="book-subtitle">Subtitle (optional)</Label><Input id="book-subtitle" value={subtitle} onChange={(event) => setSubtitle(event.target.value)} placeholder="A short line beneath the title" /></div><div><Label htmlFor="book-toc-title">Contents heading</Label><Input id="book-toc-title" value={tocTitle} onChange={(event) => setTocTitle(event.target.value)} /></div><div><Label htmlFor="book-description">Description</Label><Textarea id="book-description" rows={5} value={description} onChange={(event) => setDescription(event.target.value)} /></div><Button className="w-full" loading={saving} disabled={adding || busyId !== null || !title.trim() || !tocTitle.trim()} onClick={() => void saveDetails()}>Save details</Button></div>
          </div>
        </details>
        {notebook && <div className="mb-6 space-y-4">
          <form className="flex flex-wrap items-end gap-3" onSubmit={event => { event.preventDefault(); void createGroup(); }}>
            <div className="min-w-0 flex-1"><Label htmlFor="notebook-new-group">New group title</Label><Input id="notebook-new-group" placeholder="e.g. Biology" value={newGroupTitle} maxLength={120} disabled={busy} onChange={event => setNewGroupTitle(event.target.value)} /></div>
            <Button type="submit" disabled={busy || !newGroupTitle.trim() || (collection.subjects?.length ?? 0) >= 50}><Plus aria-hidden="true" className="h-4 w-4" />Add group</Button>
          </form>
          <div role="tablist" aria-label="Notebook groups" className="flex flex-wrap gap-2 border-b border-line pb-3">
            {groupTabs.map((group, index) => <button key={group.id} type="button" role="tab" id={"notebook-group-tab-" + index} aria-controls="notebook-group-panel" aria-selected={group.id === groupId} tabIndex={group.id === groupId ? 0 : -1} disabled={busy} onClick={() => setActiveSubjectId(group.id)} onKeyDown={event => {
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
              event.preventDefault();
              const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
              const step = (event.key === "ArrowRight" ? 1 : -1) * (rtl ? -1 : 1);
              const next = event.key === "Home" ? 0 : event.key === "End" ? groupTabs.length - 1 : (index + step + groupTabs.length) % groupTabs.length;
              setActiveSubjectId(groupTabs[next].id); document.getElementById("notebook-group-tab-" + next)?.focus();
            }} className={cn("flex min-h-11 max-w-full items-center gap-2 rounded-control border px-4 py-2 text-start text-sm font-medium disabled:opacity-50", group.id === groupId ? "border-accent bg-accent-soft text-ink" : "border-line bg-surface text-ink-soft hover:border-accent")}><span className="break-words">{group.title}</span><span className="shrink-0 text-xs text-ink-faint">{collection.items.filter(item => (item.subjectId ?? "") === group.id).length}</span></button>)}
          </div>
        </div>}
        <div id={notebook ? "notebook-group-panel" : undefined} role={notebook ? "tabpanel" : undefined} aria-labelledby={notebook ? "notebook-group-tab-" + groupTabs.findIndex(group => group.id === groupId) : undefined} tabIndex={notebook ? 0 : undefined}>


          <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="font-display text-xl text-ink">{notebook ? groupTitle : "Chapters in this book"}</h2><p className="mt-1 text-sm text-ink-soft">{visibleItems.length} {visibleItems.length === 1 ? "memory" : "memories"}{notebook ? " in this group." : " in reading order."} {isOwner ? "Add from your library, then arrange them here." : "Reorder or remove the memories below."}</p></div>{isOwner && <Button variant={pickerOpen ? "outline" : "primary"} disabled={busy} aria-expanded={pickerOpen} aria-controls="collection-memory-picker" onClick={() => setPickerOpen(!pickerOpen)}><Plus className="h-4 w-4" />{pickerOpen ? "Close library" : "Add memories"}</Button>}</div>
          {isOwner && pickerOpen && <div id="collection-memory-picker"><MemoryPicker key={notebook ? groupId : collection.id} rows={rows} included={collection.items} destinationTitle={notebook ? groupTitle : collection.title} disabled={saving || busyId !== null} onAdd={addMemory} onBusyChange={setAdding} /></div>}
          {!visibleItems.length && !pickerOpen && <p className="py-10 text-center text-sm text-ink-soft">Add memories to {notebook ? groupTitle : collection.title} to get started.</p>}
          {visibleItems.length > 0 && <ol aria-label="Memories in reading order" className="mt-8 divide-y divide-line rounded-control border border-line">{visibleItems.map((item, index) => <li key={item.id} className="flex flex-wrap items-center gap-2 px-3 py-2"><span className="font-display text-lg text-accent-dark">{String(index + 1).padStart(2, "0")}</span><span className="min-w-0 flex-1 text-sm">{rowFor(item)?.title ?? "Unavailable chapter"}</span><Button variant="ghost" size="sm" aria-label={`Move chapter ${index + 1} up`} disabled={index === 0 || busyId !== null || saving || adding} onClick={() => void moveItem(item.id, -1)}><ChevronUp className="h-4 w-4" /></Button><Button variant="ghost" size="sm" aria-label={`Move chapter ${index + 1} down`} disabled={index === visibleItems.length - 1 || busyId !== null || saving || adding} onClick={() => void moveItem(item.id, 1)}><ChevronDown className="h-4 w-4" /></Button><Button variant="ghost" size="sm" disabled={busyId !== null || saving || adding} aria-label={`Remove ${rowFor(item)?.title ?? "memory"} from this ${label.toLowerCase()}`} onClick={() => void removeMemory(item)}><Trash2 className="h-4 w-4" /></Button></li>)}</ol>}
        </div>
          {notebook && <details className="mt-6 rounded-control border border-line p-4"><summary className="cursor-pointer text-sm font-medium">Manage notebook groups</summary><div className="mt-4"><NotebookSubjects subjects={collection.subjects ?? []} busy={saving || busyId !== null || adding} save={saveSubjects} /></div></details>}
        {isOwner && <div className="mt-8 border-t border-line pt-5"><p className="text-sm font-medium text-ink">Danger zone</p><p className="mt-1 text-sm text-ink-soft">Deleting a Book cannot be undone.</p><ConfirmDialog trigger={<Button disabled={busy} variant="ghost" className="mt-3 text-danger hover:bg-danger/10"><Trash2 className="h-4 w-4" />Delete Book</Button>} title="Delete this Book?" description={`“${collection.title}” and its reading order will be removed. This cannot be undone.`} confirmLabel="Delete Book" destructive onConfirm={deleteBook} /></div>}
      </section>}

      {isOwner && <BookShareDialog objectLabel={label} bookId={collection.id} publicPath={publicPath} open={shareOpen} onOpenChange={setShareOpen} linkEnabled={collection.isPublished} linkPermission={collection.linkPermission} linkAllowExport={collection.allowExport} passwordProtected={collection.passwordProtected} members={collection.members} onChanged={(changes) => setCollection((current) => ({ ...current, ...(changes.linkEnabled === undefined ? {} : { isPublished: changes.linkEnabled }), ...(changes.linkPermission === undefined ? {} : { linkPermission: changes.linkPermission }), ...(changes.linkAllowExport === undefined ? {} : { allowExport: changes.linkAllowExport }), ...(changes.passwordProtected === undefined ? {} : { passwordProtected: changes.passwordProtected }), ...(changes.members === undefined ? {} : { members: changes.members }) }))} />}
    </div>
  );
}
