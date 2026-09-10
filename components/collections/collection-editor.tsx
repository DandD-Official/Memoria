"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookMarked, BookOpen, ChevronUp, ChevronDown, FileText, GripVertical, Layers3, ListChecks, Settings2, Share2, Trash2 } from "lucide-react";
import { BookShareDialog, type BookMember, type BookSharePermission } from "@/components/books/book-share-dialog";
import { ExportMenu } from "@/components/exports/export-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ExportProgressHandler } from "@/lib/export/types";

type ResourceType = "NOTE" | "REVIEWER" | "QUIZ";
interface CollectionItem { id: string; resourceType: ResourceType; resourceId: string }
interface Collection {
  id: string; title: string; subtitle: string | null; description: string | null; tocTitle: string;
  slug: string; isPublished: boolean; linkPermission: BookSharePermission; allowExport: boolean; expiresAt: string | null;
  passwordProtected: boolean; items: CollectionItem[]; members: BookMember[];
}
interface PickerRow { id: string; title: string }

const TABS: { type: ResourceType; label: string; icon: typeof FileText }[] = [
  { type: "NOTE", label: "Memories", icon: FileText },
  { type: "REVIEWER", label: "Reviewers", icon: Layers3 },
  { type: "QUIZ", label: "Quizzes", icon: ListChecks },
];

export function CollectionEditor({ initialCollection, access, canExport, rows }: { initialCollection: Collection; access: "OWNER" | "EDIT"; canExport: boolean; rows: Record<ResourceType, PickerRow[]> }) {
  const router = useRouter();
  const [collection, setCollection] = useState(initialCollection);
  const [tab, setTab] = useState<ResourceType>("NOTE");
  const [shareOpen, setShareOpen] = useState(false);
  const [view, setView] = useState<"book" | "chapters" | "details">("book");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(initialCollection.title);
  const [subtitle, setSubtitle] = useState(initialCollection.subtitle ?? "");
  const [description, setDescription] = useState(initialCollection.description ?? "");
  const [tocTitle, setTocTitle] = useState(initialCollection.tocTitle);
  const [saving, setSaving] = useState(false);
  const isOwner = access === "OWNER";
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
        : await request(`/api/collections/${collection.id}/items`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resourceType, resourceId }) });
      setCollection((current) => ({ ...current, items: existing ? current.items.filter((item) => item.id !== existing.id) : [...current.items, data.item] }));
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Couldn't update this Book."); }
    finally { setBusyId(null); }
  }

  async function moveItem(itemId: string, direction: -1 | 1) {
    const index = collection.items.findIndex((item) => item.id === itemId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= collection.items.length) return;
    const previous = collection.items;
    const next = [...previous];
    [next[index], next[target]] = [next[target], next[index]];
    setCollection((current) => ({ ...current, items: next }));
    try { await request(`/api/collections/${collection.id}/items`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemIds: next.map((item) => item.id) }) }); }
    catch (caught) { setCollection((current) => ({ ...current, items: previous })); setError(caught instanceof Error ? caught.message : "Couldn't reorder this Book."); }
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
    if (!response.ok) { setError(data?.error ?? "Couldn't export this Book."); return; }
    if (format === "pdf") { const { exportBookToPdf } = await import("@/lib/pdf-export"); await exportBookToPdf(data.title, data.markdown, { subtitle: data.subtitle, description: data.description, author: data.ownerName }, onProgress); }
    if (format === "docx") { const { exportBookToWord } = await import("@/lib/word-export"); await exportBookToWord(data.title, data.markdown, { subtitle: data.subtitle, description: data.description, author: data.ownerName }, onProgress); }
  }

  async function deleteBook() {
    if (!window.confirm(`Delete “${collection.title}”? This can't be undone.`)) return;
    try { await request(`/api/collections/${collection.id}`, { method: "DELETE" }); router.replace("/books"); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Couldn't delete this Book."); }
  }

  return (
    <div className="mx-auto max-w-6xl pb-10">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link href="/books" className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-ink-soft hover:text-ink"><ArrowLeft className="h-4 w-4" />All Books</Link>
        <div className="flex items-center gap-2">
          {canExport && <ExportMenu options={[{ value: "pdf", label: "PDF document" }, { value: "docx", label: "Word document" }, { value: "json", label: "Memoria JSON" }]} onExport={exportBook} />}
          {isOwner && <Button size="sm" onClick={() => setShareOpen(true)}><Share2 className="h-4 w-4" />Share</Button>}
        </div>
      </div>

      <header className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-dark">Book studio</p><h1 className="mt-1 font-display text-3xl text-ink">{collection.title}</h1>{collection.subtitle && <p className="mt-1 text-sm text-ink-soft">{collection.subtitle}</p>}</div>
        <Badge tone={isOwner ? "accent" : "neutral"}>{isOwner ? "Owner" : "Editor"}</Badge>
      </header>
      {error && <p className="mb-4 rounded-control border border-danger/25 bg-danger/5 px-4 py-3 text-sm text-danger" role="alert">{error}</p>}

      <nav aria-label="Book studio sections" className="mb-5 flex w-full gap-1 overflow-x-auto rounded-card border border-line bg-surface-muted p-1 sm:w-fit">
        {[
          { key: "book" as const, label: "Book", icon: BookMarked },
          { key: "chapters" as const, label: "Chapters", icon: GripVertical },
          { key: "details" as const, label: "Details", icon: Settings2 },
        ].map((item) => <button key={item.key} type="button" aria-current={view === item.key ? "page" : undefined} onClick={() => setView(item.key)} className={cn("inline-flex min-h-10 shrink-0 items-center gap-2 rounded-control px-4 text-sm font-medium transition-colors", view === item.key ? "bg-surface text-ink shadow-sm" : "text-ink-soft hover:text-ink")}><item.icon className="h-4 w-4" />{item.label}</button>)}
      </nav>

      {view === "book" && <section aria-label="Book preview" className="relative overflow-hidden rounded-[1.35rem] border border-line-strong bg-action p-2 shadow-card-hover sm:p-3">
        <div className="pointer-events-none absolute inset-y-3 left-1/2 z-10 hidden w-8 -translate-x-1/2 bg-gradient-to-r from-transparent via-ink/15 to-transparent md:block" aria-hidden="true" />
        <div className="grid min-h-[31rem] overflow-hidden rounded-[0.9rem] md:grid-cols-2">
          <article className="relative flex min-w-0 flex-col justify-between overflow-hidden bg-surface-muted px-6 py-8 text-ink sm:px-10 sm:py-12 md:rounded-l-[0.75rem] md:border-r md:border-line">
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full border-[28px] border-accent/15" aria-hidden="true" />
            <div><div className="flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-accent-dark"><BookOpen className="h-4 w-4" />Memoria Book</div><div className="mt-14 h-px w-12 bg-accent" /><h2 className="mt-6 max-w-md font-display text-4xl leading-[1.08] sm:text-5xl">{collection.title}</h2>{collection.subtitle && <p className="mt-4 max-w-sm font-display text-xl italic text-ink-soft">{collection.subtitle}</p>}{collection.description && <p className="mt-6 max-w-md text-sm leading-7 text-ink-soft">{collection.description}</p>}</div>
            <div className="mt-12 flex items-end justify-between border-t border-line pt-4 text-xs text-ink-faint"><span>{collection.items.length} chapter{collection.items.length === 1 ? "" : "s"}</span><span>Memoria</span></div>
          </article>
          <article className="min-w-0 bg-surface-raised px-5 py-8 text-ink sm:px-9 sm:py-12 md:rounded-r-[0.75rem]">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-ink-faint">Table of contents</p><h2 className="mt-2 font-display text-3xl">{collection.tocTitle}</h2>
            <div className="mt-8">{collection.items.length === 0 ? <div className="rounded-lg border border-dashed border-line p-8 text-center"><BookOpen className="mx-auto h-6 w-6 text-accent-dark" /><p className="mt-3 font-display text-lg">The pages are waiting.</p><p className="mt-1 text-xs leading-relaxed text-ink-faint">Add your first Memory in the Chapters section.</p></div> : <ol className="space-y-1">{collection.items.map((item, index) => { const row = rowFor(item); const Icon = TABS.find((entry) => entry.type === item.resourceType)?.icon ?? FileText; return <li key={item.id} className="group flex min-w-0 items-center gap-3 border-b border-line py-3"><span className="w-7 shrink-0 font-display text-lg text-accent-dark">{String(index + 1).padStart(2, "0")}</span><Icon className="h-4 w-4 shrink-0 text-ink-faint" /><span className="min-w-0 flex-1 truncate text-sm font-medium">{row?.title ?? "Unavailable chapter"}</span><div className="flex shrink-0 opacity-60 transition-opacity group-hover:opacity-100"><button type="button" aria-label={`Move ${row?.title ?? "chapter"} up`} disabled={index === 0} onClick={() => void moveItem(item.id, -1)} className="rounded p-1 hover:bg-ink/5 disabled:opacity-20"><ChevronUp className="h-4 w-4" /></button><button type="button" aria-label={`Move ${row?.title ?? "chapter"} down`} disabled={index === collection.items.length - 1} onClick={() => void moveItem(item.id, 1)} className="rounded p-1 hover:bg-ink/5 disabled:opacity-20"><ChevronDown className="h-4 w-4" /></button></div></li>; })}</ol>}</div>
          </article>
        </div>
      </section>}

      {view === "chapters" && <section className="rounded-card border border-line bg-surface p-5 shadow-sm">
          <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-accent-soft text-accent-dark"><GripVertical className="h-4 w-4" /></span><div><h2 className="font-display text-xl text-ink">Build the chapters</h2><p className="mt-1 text-sm text-ink-soft">{isOwner ? "Choose material and arrange it in reading order." : "Reorder or remove the chapters already in this Book."}</p></div></div>
          <div className="mt-5 flex max-w-full gap-1 overflow-x-auto rounded-control bg-surface-muted p-1">{TABS.map((item) => <button key={item.type} type="button" onClick={() => setTab(item.type)} className={cn("inline-flex min-h-10 shrink-0 items-center gap-2 rounded-control px-3 text-sm font-medium", tab === item.type ? "bg-surface text-ink shadow-sm" : "text-ink-soft hover:text-ink")}><item.icon className="h-4 w-4" />{item.label}</button>)}</div>
          <div className="mt-3 divide-y divide-line rounded-card border border-line">{rows[tab].length === 0 ? <p className="p-6 text-center text-sm text-ink-faint">No {TABS.find((item) => item.type === tab)!.label.toLowerCase()} available.</p> : rows[tab].map((row) => { const included = collection.items.some((item) => item.resourceType === tab && item.resourceId === row.id); return <label key={row.id} className="flex min-h-12 cursor-pointer items-center gap-3 px-3 py-2 hover:bg-surface-muted"><span className={cn("flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold", included ? "bg-action text-action-foreground" : "bg-ink/5 text-ink-faint")}>{included ? collection.items.findIndex((item) => item.resourceType === tab && item.resourceId === row.id) + 1 : "+"}</span><span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{row.title}</span><input type="checkbox" checked={included} disabled={busyId === `${tab}:${row.id}`} onChange={() => void toggleItem(tab, row.id)} className="h-4 w-4 shrink-0 accent-accent" /></label>; })}</div>
      </section>}

      {view === "details" && <section className="mx-auto max-w-2xl rounded-card border border-line bg-surface p-5 shadow-sm sm:p-6">
        <h2 className="font-display text-xl text-ink">Book details</h2><p className="mt-1 text-sm text-ink-soft">These words appear on the cover and opening pages.</p>
        <div className="mt-5 space-y-4"><div><Label htmlFor="book-title">Title</Label><Input id="book-title" value={title} onChange={(event) => setTitle(event.target.value)} /></div><div><Label htmlFor="book-subtitle">Subtitle (optional)</Label><Input id="book-subtitle" value={subtitle} onChange={(event) => setSubtitle(event.target.value)} placeholder="A short line beneath the title" /></div><div><Label htmlFor="book-toc-title">Contents heading</Label><Input id="book-toc-title" value={tocTitle} onChange={(event) => setTocTitle(event.target.value)} /></div><div><Label htmlFor="book-description">Description</Label><Textarea id="book-description" rows={5} value={description} onChange={(event) => setDescription(event.target.value)} /></div><Button className="w-full" loading={saving} disabled={!title.trim() || !tocTitle.trim()} onClick={() => void saveDetails()}>Save details</Button></div>
        {isOwner && <div className="mt-8 border-t border-line pt-5"><p className="text-sm font-medium text-ink">Danger zone</p><p className="mt-1 text-sm text-ink-soft">Deleting a Book cannot be undone.</p><Button variant="ghost" className="mt-3 text-danger hover:bg-danger/10" onClick={() => void deleteBook()}><Trash2 className="h-4 w-4" />Delete Book</Button></div>}
      </section>}
      {isOwner && <BookShareDialog bookId={collection.id} publicPath={publicPath} open={shareOpen} onOpenChange={setShareOpen} linkEnabled={collection.isPublished} linkPermission={collection.linkPermission} linkAllowExport={collection.allowExport} passwordProtected={collection.passwordProtected} members={collection.members} onChanged={(changes) => setCollection((current) => ({ ...current, ...(changes.linkEnabled === undefined ? {} : { isPublished: changes.linkEnabled }), ...(changes.linkPermission === undefined ? {} : { linkPermission: changes.linkPermission }), ...(changes.linkAllowExport === undefined ? {} : { allowExport: changes.linkAllowExport }), ...(changes.passwordProtected === undefined ? {} : { passwordProtected: changes.passwordProtected }), ...(changes.members === undefined ? {} : { members: changes.members }) }))} />}
    </div>
  );
}
