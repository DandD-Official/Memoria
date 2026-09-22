"use client";

import { useMemo, useState } from "react";
import { Check, FileText, Layers3, ListChecks, Plus, Search, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatDate } from "@/lib/utils";
import { findPickerMemories, memoryKey, type MemoryType, type MemoryPickerRow, type PickerMemory } from "@/lib/books/memory-picker";

const TYPES = [{ type: "NOTE", label: "Notes", singular: "Note", icon: FileText }, { type: "REVIEWER", label: "Reviewers", singular: "Reviewer", icon: Layers3 }, { type: "QUIZ", label: "Quizzes", singular: "Quiz", icon: ListChecks }] as const;
const PAGE_SIZE = 20;

export function MemoryPicker({ rows, included, destinationTitle, disabled, onAdd, onBusyChange }: {
  rows: Record<MemoryType, MemoryPickerRow[]>;
  included: { resourceType: MemoryType; resourceId: string }[];
  destinationTitle: string; disabled: boolean;
  onAdd: (memory: PickerMemory) => Promise<void>;
  onBusyChange: (busy: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<MemoryType | "ALL">("ALL");
  const [favorites, setFavorites] = useState(false), [archived, setArchived] = useState(false);
  const [tag, setTag] = useState(""), [sort, setSort] = useState<"recent" | "title">("recent");
  const [selected, setSelected] = useState<PickerMemory[]>([]);
  const [selectionOnly, setSelectionOnly] = useState(false), [limit, setLimit] = useState(PAGE_SIZE);
  const [saving, setSaving] = useState(false), [message, setMessage] = useState(""), [error, setError] = useState("");
  const memories = useMemo(() => TYPES.flatMap(({ type: resourceType }) => rows[resourceType].map(row => ({ ...row, resourceType }))), [rows]);
  const existing = new Set(included.map(item => item.resourceType + ":" + item.resourceId));
  const available = memories.filter(memory => !existing.has(memoryKey(memory)));
  const pending = selected.filter(memory => !existing.has(memoryKey(memory)));
  const selectedKeys = new Set(pending.map(memoryKey));
  const tags = Array.from(new Set(available.flatMap(memory => memory.tags ?? []))).sort();
  const results = selectionOnly ? pending : findPickerMemories(available, { query, type, favorites, tag, sort, archived });
  const visible = results.slice(0, limit);
  const busy = disabled || saving;
  function changeFilters(change: () => void) { change(); setLimit(PAGE_SIZE); setSelectionOnly(false); }
  function toggle(memory: PickerMemory) { setMessage(""); setSelected(current => selectedKeys.has(memoryKey(memory)) ? current.filter(item => memoryKey(item) !== memoryKey(memory)) : [...current, memory]); }
  function resetFilters() { setQuery(""); setType("ALL"); setFavorites(false); setArchived(false); setTag(""); setSelectionOnly(false); setLimit(PAGE_SIZE); }
  async function addSelected() {
    if (!pending.length || busy) return;
    setSaving(true); onBusyChange(true); setMessage(""); setError("");
    let added = 0;
    try {
      for (const memory of pending) {
        await onAdd(memory);
        added++;
        setSelected(current => current.filter(item => memoryKey(item) !== memoryKey(memory)));
        setMessage("Added " + added + " of " + pending.length + " memories...");
      }
      setMessage(added + (added === 1 ? " memory added." : " memories added.")); setSelectionOnly(false);
    } catch (reason) {
      setMessage(added ? added + (added === 1 ? " memory added." : " memories added.") : "");
      setError((reason instanceof Error ? reason.message : "Could not add memories.") + " Your remaining selection is kept. Try again.");
    } finally { setSaving(false); onBusyChange(false); }
  }
  return <section aria-label="Find and add memories" className="mt-6 rounded-card border border-line bg-surface-muted p-4 sm:p-6">
    <div className="mb-6"><p className="text-xs font-semibold uppercase tracking-wide text-accent-dark">Your library</p><h3 className="mt-1 font-display text-2xl">Find the memories that belong together</h3><p className="mt-2 text-sm text-ink-soft">Choose memories for <strong className="font-medium text-ink">{destinationTitle}</strong>. Search across notes, reviewers, and quizzes.</p></div>
    <div className="relative"><Search aria-hidden="true" className="pointer-events-none absolute start-4 top-4 h-5 w-5 text-ink-soft" /><Input aria-label="Search memories by title, description, or tag" placeholder="Search a topic, title, or tag..." className="h-14 ps-12 pe-12 text-base" value={query} disabled={busy} onChange={event => changeFilters(() => setQuery(event.target.value))} />{query && <Button variant="ghost" size="icon" className="absolute end-1 top-1.5" aria-label="Clear search" disabled={busy} onClick={() => changeFilters(() => setQuery(""))}><X className="h-4 w-4" /></Button>}</div>
    <div className="mt-4 flex flex-wrap items-center gap-2" role="group" aria-label="Memory type">
      <Button variant={type === "ALL" ? "secondary" : "ghost"} size="sm" aria-pressed={type === "ALL"} disabled={busy} onClick={() => changeFilters(() => setType("ALL"))}>All memories</Button>
      {TYPES.map(item => <Button key={item.type} variant={type === item.type ? "secondary" : "ghost"} size="sm" aria-pressed={type === item.type} disabled={busy} onClick={() => changeFilters(() => setType(item.type))}><item.icon aria-hidden="true" className="h-4 w-4" />{item.label}</Button>)}
    </div>
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <Button size="sm" variant={favorites ? "secondary" : "outline"} aria-pressed={favorites} disabled={busy} onClick={() => changeFilters(() => setFavorites(!favorites))}><Star aria-hidden="true" className={cn("h-4 w-4", favorites && "fill-current")} />Favorites</Button>
      <select aria-label="Filter by tag" disabled={busy} value={tag} onChange={event => changeFilters(() => setTag(event.target.value))} className="min-h-11 min-w-0 max-w-full rounded-control border border-line bg-surface px-3 text-sm"><option value="">All tags</option>{tags.map(name => <option key={name} value={name}>{name}</option>)}</select>
      <select aria-label="Sort memories" disabled={busy} value={sort} onChange={event => changeFilters(() => setSort(event.target.value as typeof sort))} className="min-h-11 rounded-control border border-line bg-surface px-3 text-sm"><option value="recent">Recently updated</option><option value="title">Title A-Z</option></select>
      <label className="flex min-h-11 items-center gap-2 text-sm text-ink-soft"><input type="checkbox" checked={archived} disabled={busy} onChange={event => changeFilters(() => setArchived(event.target.checked))} className="h-4 w-4 accent-accent" />Include archived</label>
    </div>
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
      <p role="status" className="text-sm text-ink-soft">{selectionOnly ? pending.length + " selected" : results.length + (results.length === 1 ? " memory found" : " memories found")}<span className="block text-xs">Memories already added are hidden.</span></p>
      <div className="flex flex-wrap gap-2"><Button variant="ghost" size="sm" disabled={busy || !pending.length} aria-pressed={selectionOnly} onClick={() => { setSelectionOnly(!selectionOnly); setLimit(PAGE_SIZE); }}>{selectionOnly ? "Back to results" : "Review selection (" + pending.length + ")"}</Button><Button variant="outline" size="sm" disabled={busy || !visible.some(memory => !selectedKeys.has(memoryKey(memory)))} onClick={() => setSelected(current => [...current, ...visible.filter(memory => !selectedKeys.has(memoryKey(memory)))])}>Select shown ({visible.length})</Button></div>
    </div>
    <div className="mt-3 grid gap-3 min-[900px]:grid-cols-2">
      {visible.map(memory => { const checked = selectedKeys.has(memoryKey(memory)); const info = TYPES.find(item => item.type === memory.resourceType)!; return <label key={memoryKey(memory)} className={cn("flex min-w-0 cursor-pointer items-start gap-3 rounded-control border p-4 transition-colors focus-within:ring-2 focus-within:ring-accent", checked ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-accent", busy && "cursor-default opacity-70")}>
        <input type="checkbox" aria-label={"Select " + info.singular.toLowerCase() + ": " + memory.title} checked={checked} disabled={busy} onChange={() => toggle(memory)} className="mt-1 h-5 w-5 shrink-0 accent-accent" />
        <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2 text-xs text-ink-soft"><info.icon aria-hidden="true" className="h-3.5 w-3.5" />{info.singular}{memory.isFavorite && <Star aria-label="Favorite" className="h-3.5 w-3.5 fill-current text-accent-dark" />}{memory.archived && <span>Archived</span>}</span><span className="mt-2 block break-words text-sm font-semibold text-ink">{memory.title}</span>{memory.description && <span className="mt-1 block line-clamp-2 break-words text-sm text-ink-soft">{memory.description}</span>}
          {!!memory.tags?.length && <span className="mt-3 flex flex-wrap gap-1.5">{memory.tags.map(name => <span key={name} className="max-w-full break-words rounded bg-surface-muted px-2 py-1 text-xs text-ink-soft">{name}</span>)}</span>}
          {memory.updatedAt && <span className="mt-3 block text-xs text-ink-faint">Updated {formatDate(memory.updatedAt)}</span>}
        </span>
      </label>; })}
    </div>
    {!results.length && <div className="py-10 text-center"><Search aria-hidden="true" className="mx-auto h-6 w-6 text-ink-faint" /><p className="mt-3 font-medium">{!available.length ? "You're all caught up" : "No memories match this view"}</p><p className="mt-1 text-sm text-ink-soft">{!available.length ? "All available memories are already included, or your library is empty." : "Try a broader topic or clear your filters."}</p>{!!available.length && <Button className="mt-4" variant="outline" disabled={busy} onClick={resetFilters}>Clear filters</Button>}</div>}
    {results.length > visible.length && <Button className="mt-4 w-full" variant="outline" disabled={busy} onClick={() => setLimit(current => current + PAGE_SIZE)}>Show more ({results.length - visible.length} remaining)</Button>}
    <div className="sticky bottom-3 z-10 mt-6 flex flex-wrap items-center gap-3 rounded-card border border-line bg-surface-raised p-4 shadow-card">
      <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{pending.length} selected</p><p className="text-xs text-ink-soft">Adding to {destinationTitle}</p></div>
      {!!pending.length && <Button variant="ghost" size="sm" disabled={busy} onClick={() => { setSelected([]); setSelectionOnly(false); }}>Clear selection</Button>}
      <Button disabled={busy || !pending.length} loading={saving} onClick={() => void addSelected()} className="max-w-full whitespace-normal"><Plus aria-hidden="true" className="h-4 w-4 shrink-0" />Add {pending.length || "selected"} {pending.length === 1 ? "memory" : "memories"}</Button>
      {(message || error) && <div className="basis-full text-sm">{message && <p role="status" className="flex items-center gap-2 text-ink-soft"><Check aria-hidden="true" className="h-4 w-4" />{message}</p>}{error && <p role="alert" className="mt-1 text-danger">{error}</p>}</div>}
    </div>
  </section>;
}
