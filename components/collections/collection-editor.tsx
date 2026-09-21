"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookMarked, ChevronUp, ChevronDown, FileText, GripVertical, Layers3, ListChecks, Settings2, Share2, Trash2 } from "lucide-react";
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
interface PickerRow { id: string; title: string }

const TABS: { type: ResourceType; label: string; icon: typeof FileText }[] = [
  { type: "NOTE", label: "Notes", icon: FileText },
  { type: "REVIEWER", label: "Reviewers", icon: Layers3 },
  { type: "QUIZ", label: "Quizzes", icon: ListChecks },
];

export function CollectionEditor({ initialCollection, access, canExport, rows }: { initialCollection: Collection; access: "OWNER" | "EDIT"; canExport: boolean; rows: Record<ResourceType, PickerRow[]> }) {
  const router = useRouter();
  const [collection, setCollection] = useState(initialCollection);
  const [tab, setTab] = useState<ResourceType>("NOTE");
  const [shareOpen, setShareOpen] = useState(false);
  const [view, setView] = useState<"book" | "chapters" | "details">(initialCollection.items.length ? "book" : "chapters");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(initialCollection.title);
  const [subtitle, setSubtitle] = useState(initialCollection.subtitle ?? "");
  const [description, setDescription] = useState(initialCollection.description ?? "");
  const [tocTitle, setTocTitle] = useState(initialCollection.tocTitle);
  const [saving, setSaving] = useState(false);
  const notebook = collection.kind === "NOTEBOOK";
  const label = notebook ? "Notebook" : "Book";
  const base = notebook ? "/notebooks" : "/books";
  const [subjectId, setSubjectId] = useState("");
  const [search, setSearch] = useState("");
  const isOwner = access === "OWNER";
  const orderedItems = notebook ? subjectOrder(collection.items, collection.subjects ?? []) : collection.items;
  const publicPath = `/c/${collection.slug}`;

  function rowFor(item: CollectionItem) { return rows[item.resourceType].find((row) => row.id === item.resourceId); }
  async function request(path: string, init: RequestInit) {
    const response = await fetch(path, init);
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.error ?? "Couldn't update this Book.");
    return data;
  }

  async function toggleItem(resourceType: ResourceType, resourceId: string) {
    const key = `${resourceType}:${resourceId}`;
    const existing = collection.items.find((item) => item.resourceType === resourceType && item.resourceId === resourceId);
    setBusyId(key); setError(null);
    try {
      const data = existing
        ? await request(`/api/collections/${collection.id}/items?itemId=${existing.id}`, { method: "DELETE" })
        : await request(`/api/collections/${collection.id}/items`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resourceType, resourceId, subjectId: subjectId || null }) });
      setCollection((current) => ({ ...current, items: existing ? current.items.filter((item) => item.id !== existing.id) : [...current.items, data.item] }));
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Couldn't update this Book."); }
    finally { setBusyId(null); }
  }

  async function saveSubjects(subjects: NotebookSubject[]) {
    setSaving(true); setError(null);
    try {
      await request(`/api/collections/${collection.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subjects }) });
      setCollection(current => ({ ...current, subjects, items: current.items.map(item => ({ ...item, subjectId: subjects.some(subject => subject.id === item.subjectId) ? item.subjectId : null })) }));
      if (!subjects.some(subject => subject.id === subjectId)) setSubjectId("");
      return true;
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Couldn't save subjects."); return false; }
    finally { setSaving(false); }
  }
  async function assignSubject(itemId: string, next: string) {
    setBusyId(itemId); setError(null);
    try {
      await request(`/api/collections/${collection.id}/items`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemId, subjectId: next || null }) });
      setCollection(current => ({ ...current, items: current.items.map(item => item.id === itemId ? { ...item, subjectId: next || null } : item) }));
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Couldn't move this memory."); }
    finally { setBusyId(null); }
  }

  async function moveItem(itemId: string, direction: -1 | 1) {
    const index = orderedItems.findIndex((item) => item.id === itemId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= collection.items.length) return;
    if (busyId) return;
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
          {canExport && <ExportMenu options={[{ value: "pdf", label: "PDF document" }, { value: "docx", label: "Word - editable text" }, { value: "json", label: "Memoria JSON" }]} onExport={exportBook} />}
          {isOwner && <Link href={`${publicPath}?view=guest`} className="inline-flex min-h-11 items-center rounded-control border border-line px-3 text-sm">View as Guest</Link>}{isOwner && <Button size="sm" onClick={() => setShareOpen(true)}><Share2 className="h-4 w-4" />Share</Button>}
        </div>
      </div>

      <header className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-dark">{label} studio</p><h1 className="mt-1 font-display text-3xl text-ink">{collection.title}</h1>{collection.subtitle && <p className="mt-1 text-sm text-ink-soft">{collection.subtitle}</p>}</div>
        <Badge tone={isOwner ? "accent" : "neutral"}>{isOwner ? "Owner" : "Editor"}</Badge>
      </header>
      {error && <p className="mb-4 rounded-control border border-danger/25 bg-danger/5 px-4 py-3 text-sm text-danger" role="alert">{error}</p>}

      <nav aria-label="Book studio sections" className="mb-5 flex w-full gap-1 overflow-x-auto rounded-card border border-line bg-surface-muted p-1 sm:w-fit">
        {[
          { key: "book" as const, label, icon: BookMarked },
          { key: "chapters" as const, label: notebook ? "Subjects & memories" : "Chapters", icon: GripVertical },
          { key: "details" as const, label: "Details", icon: Settings2 },
        ].map((item) => <button key={item.key} type="button" aria-current={view === item.key ? "page" : undefined} onClick={() => setView(item.key)} className={cn("inline-flex min-h-10 shrink-0 items-center gap-2 rounded-control px-4 text-sm font-medium transition-colors", view === item.key ? "bg-surface text-ink shadow-sm" : "text-ink-soft hover:text-ink")}><item.icon className="h-4 w-4" />{item.label}</button>)}
      </nav>

      {view === "book" && <BookPreview id={collection.id} revision={JSON.stringify([collection.title, collection.subtitle, collection.description, collection.tocTitle, collection.subjects, collection.items])} />}

      {view === "chapters" && <section className="rounded-card border border-line bg-surface p-5 shadow-sm">
          {notebook && <NotebookSubjects subjects={collection.subjects ?? []} busy={saving || busyId !== null} save={saveSubjects} />}
          <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-accent-soft text-accent-dark"><GripVertical className="h-4 w-4" /></span><div><h2 className="font-display text-xl text-ink">{notebook ? "Choose memories for each subject" : "Build the chapters"}</h2><p className="mt-1 text-sm text-ink-soft">{isOwner ? "Choose material and arrange it in reading order." : "Reorder or remove the chapters already in this Book."}</p></div></div>
          {collection.items.length > 0 && <ol className="mt-5 divide-y divide-line rounded-control border border-line">{orderedItems.map((item, index) => <li key={item.id} className="flex flex-wrap items-center gap-2 px-3 py-2"><span className="font-display text-lg text-accent-dark">{String(index + 1).padStart(2, "0")}</span><span className="min-w-0 flex-1 text-sm">{rowFor(item)?.title ?? "Unavailable chapter"}</span>{notebook && <select aria-label={`Subject for ${rowFor(item)?.title ?? "memory"}`} disabled={busyId !== null || saving} value={item.subjectId ?? ""} onChange={event => void assignSubject(item.id, event.target.value)} className="h-11 max-w-40 rounded-control border border-line bg-surface px-2 text-sm"><option value="">Unfiled</option>{collection.subjects?.map(subject => <option key={subject.id} value={subject.id}>{subject.title}</option>)}</select>}<Button variant="ghost" size="sm" aria-label={`Move chapter ${index + 1} up`} disabled={index === 0 || busyId !== null || saving || (notebook && orderedItems[index - 1]?.subjectId !== item.subjectId)} onClick={() => void moveItem(item.id, -1)}><ChevronUp className="h-4 w-4" /></Button><Button variant="ghost" size="sm" aria-label={`Move chapter ${index + 1} down`} disabled={index === orderedItems.length - 1 || busyId !== null || saving || (notebook && orderedItems[index + 1]?.subjectId !== item.subjectId)} onClick={() => void moveItem(item.id, 1)}><ChevronDown className="h-4 w-4" /></Button></li>)}</ol>}
          <div className="mt-5 flex flex-wrap gap-3"><Input aria-label="Find memories" placeholder="Find a memory?" value={search} onChange={event => setSearch(event.target.value)} />{notebook && <label className="flex items-center gap-2 text-sm">Add new memories to<select value={subjectId} onChange={event => setSubjectId(event.target.value)} className="h-11 rounded-control border border-line bg-surface px-3"><option value="">Unfiled</option>{collection.subjects?.map(subject => <option key={subject.id} value={subject.id}>{subject.title}</option>)}</select></label>}</div>
          <div className="mt-5 flex max-w-full gap-1 overflow-x-auto rounded-control bg-surface-muted p-1">{TABS.map((item) => <button key={item.type} type="button" onClick={() => setTab(item.type)} className={cn("inline-flex min-h-10 shrink-0 items-center gap-2 rounded-control px-3 text-sm font-medium", tab === item.type ? "bg-surface text-ink shadow-sm" : "text-ink-soft hover:text-ink")}><item.icon className="h-4 w-4" />{item.label}</button>)}</div>
          <div className="mt-3 divide-y divide-line rounded-card border border-line">{rows[tab].length === 0 ? <p className="p-6 text-center text-sm text-ink-faint">No {TABS.find((item) => item.type === tab)!.label.toLowerCase()} available.</p> : rows[tab].filter(row => row.title.toLowerCase().includes(search.toLowerCase())).map((row) => { const included = collection.items.some((item) => item.resourceType === tab && item.resourceId === row.id); return <label key={row.id} className="flex min-h-12 cursor-pointer items-center gap-3 px-3 py-2 hover:bg-surface-muted"><span className={cn("flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold", included ? "bg-action text-action-foreground" : "bg-ink/5 text-ink-faint")}>{included ? collection.items.findIndex((item) => item.resourceType === tab && item.resourceId === row.id) + 1 : "+"}</span><span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{row.title}</span><input type="checkbox" checked={included} disabled={busyId !== null} onChange={() => void toggleItem(tab, row.id)} className="h-4 w-4 shrink-0 accent-accent" /></label>; })}</div>
      </section>}

      {view === "details" && <section className="mx-auto max-w-2xl rounded-card border border-line bg-surface p-5 shadow-sm sm:p-6">
        <h2 className="font-display text-xl text-ink">{label} details</h2><p className="mt-1 text-sm text-ink-soft">These words appear on the cover and opening pages.</p>
        <div className="mt-5 space-y-4"><div><Label htmlFor="book-title">Title</Label><Input id="book-title" value={title} onChange={(event) => setTitle(event.target.value)} /></div><div><Label htmlFor="book-subtitle">Subtitle (optional)</Label><Input id="book-subtitle" value={subtitle} onChange={(event) => setSubtitle(event.target.value)} placeholder="A short line beneath the title" /></div><div><Label htmlFor="book-toc-title">Contents heading</Label><Input id="book-toc-title" value={tocTitle} onChange={(event) => setTocTitle(event.target.value)} /></div><div><Label htmlFor="book-description">Description</Label><Textarea id="book-description" rows={5} value={description} onChange={(event) => setDescription(event.target.value)} /></div><Button className="w-full" loading={saving} disabled={!title.trim() || !tocTitle.trim()} onClick={() => void saveDetails()}>Save details</Button></div>
        {isOwner && <div className="mt-8 border-t border-line pt-5"><p className="text-sm font-medium text-ink">Danger zone</p><p className="mt-1 text-sm text-ink-soft">Deleting a Book cannot be undone.</p><ConfirmDialog trigger={<Button variant="ghost" className="mt-3 text-danger hover:bg-danger/10"><Trash2 className="h-4 w-4" />Delete Book</Button>} title="Delete this Book?" description={`“${collection.title}” and its reading order will be removed. This cannot be undone.`} confirmLabel="Delete Book" destructive onConfirm={deleteBook} /></div>}
      </section>}
      {isOwner && <BookShareDialog objectLabel={label} bookId={collection.id} publicPath={publicPath} open={shareOpen} onOpenChange={setShareOpen} linkEnabled={collection.isPublished} linkPermission={collection.linkPermission} linkAllowExport={collection.allowExport} passwordProtected={collection.passwordProtected} members={collection.members} onChanged={(changes) => setCollection((current) => ({ ...current, ...(changes.linkEnabled === undefined ? {} : { isPublished: changes.linkEnabled }), ...(changes.linkPermission === undefined ? {} : { linkPermission: changes.linkPermission }), ...(changes.linkAllowExport === undefined ? {} : { allowExport: changes.linkAllowExport }), ...(changes.passwordProtected === undefined ? {} : { passwordProtected: changes.passwordProtected }), ...(changes.members === undefined ? {} : { members: changes.members }) }))} />}
    </div>
  );
}
