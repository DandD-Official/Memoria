"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, Search, FileText, Layers3, ListChecks, Workflow, BookOpen, Clock, ArrowRight } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { primaryNavigation } from "@/components/layout/navigation";

type SearchItem = { id: string; title: string };
type SearchResults = { notes?: SearchItem[]; reviewers?: SearchItem[]; quizzes?: SearchItem[]; diagrams?: SearchItem[]; collections?: SearchItem[] };
const groups = [
  { key: "notes", label: "Source notes", path: "/notes/", icon: FileText },
  { key: "reviewers", label: "Study guides", path: "/reviewers/", icon: Layers3 },
  { key: "quizzes", label: "Practice", path: "/quizzes/", icon: ListChecks },
  { key: "diagrams", label: "Diagrams", path: "/diagrams?open=", icon: Workflow },
  { key: "collections", label: "Study spaces", path: "/books/", icon: BookOpen },
] as const;

export function CommandSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>({});
  const [recent, setRecent] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    function shortcut(event: KeyboardEvent) { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); onOpenChange(!open); } }
    document.addEventListener("keydown", shortcut);
    return () => document.removeEventListener("keydown", shortcut);
  }, [onOpenChange, open]);
  useEffect(() => {
    if (!open) return;
    try { const stored: unknown = JSON.parse(localStorage.getItem("memoria-searches") ?? "[]"); setRecent(Array.isArray(stored) ? stored.filter((value): value is string => typeof value === "string").slice(0, 4) : []); } catch { setRecent([]); }
    const controller = new AbortController();
    setLoading(true);
    setFailed(false);
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(query.trim() ? `/api/search?q=${encodeURIComponent(query.trim())}` : "/api/search?recommended=1", { signal: controller.signal });
        if (!response.ok) throw new Error();
        setResults(await response.json());
      } catch { if (!controller.signal.aborted) { setFailed(true); setResults({}); } }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }, 180);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [open, query]);
  function remember() { if (!query.trim()) return; try { localStorage.setItem("memoria-searches", JSON.stringify([query.trim(), ...recent.filter(item => item !== query.trim())].slice(0, 4))); } catch { /* Search remains available without storage. */ } }
  return <Dialog open={open} onOpenChange={onOpenChange} title="Find a thread" description="Search your material, a topic, or a tag." className="sm:max-w-2xl">
    <form onSubmit={event => { event.preventDefault(); if (query.trim()) { remember(); onOpenChange(false); router.push(`/search?q=${encodeURIComponent(query.trim())}`); } }} className="flex items-center gap-3 border-b-2 border-action pb-3">
      <Search className="h-5 w-5 shrink-0 text-ink-soft" /><input autoFocus aria-label="Search your library" placeholder="What are you looking for?" value={query} onChange={event => setQuery(event.target.value)} className="min-h-11 min-w-0 flex-1 bg-transparent text-base outline-offset-4" /><button aria-label="See all search results" className="flex h-11 w-11 items-center justify-center rounded-control hover:bg-surface-muted"><ArrowRight className="h-5 w-5" /></button>
    </form>
    <div className="max-h-[50dvh] overflow-y-auto pt-5" aria-live="polite" aria-busy={loading}>
      {loading ? <div className="space-y-3 py-4" role="status"><span className="sr-only">Searching your library</span>{[1, 2, 3].map(item => <div key={item} className="h-10 animate-pulse rounded-control bg-surface-muted" />)}</div> : failed ? <p className="py-4 text-sm text-danger" role="alert">Search could not connect. Check your connection and try searching again.</p> : groups.map(group => results[group.key]?.length ? <section key={group.key} className="mb-5"><h3 className="index-label mb-2">{group.label}</h3>{results[group.key]!.slice(0, 4).map(item => <Link key={item.id} href={`${group.path}${item.id}`} onClick={() => { remember(); onOpenChange(false); }} className="flex min-h-12 items-center gap-3 rounded-control px-2 text-sm hover:bg-surface-muted"><group.icon className="h-4 w-4 shrink-0 text-ink-faint" /><span className="min-w-0 break-words">{item.title}</span><ArrowUpRight className="ms-auto h-4 w-4 shrink-0 text-ink-faint" /></Link>)}</section> : null)}
      {!loading && !failed && query && !Object.values(results).some(items => Array.isArray(items) && items.length) && <p className="py-5 text-sm text-ink-soft">No matches for “{query}”. Try a shorter topic or a different tag.</p>}
      {!query && <><div className="mb-4 flex flex-wrap gap-2">{recent.map(item => <button key={item} onClick={() => setQuery(item)} className="inline-flex min-h-10 items-center gap-2 rounded-control border border-line px-3 text-xs"><Clock className="h-3 w-3" />{item}</button>)}</div><p className="index-label mb-2">Go somewhere</p><div className="grid grid-cols-2 gap-2">{primaryNavigation.map(item => <Link key={item.href} href={item.href} onClick={() => onOpenChange(false)} className="flex min-h-12 items-center gap-3 rounded-control bg-surface-muted px-3 text-sm"><item.icon className="h-4 w-4" />{item.label}</Link>)}</div></>}
    </div>
  </Dialog>;
}
