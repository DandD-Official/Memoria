"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Search, LogOut, User as UserIcon, FileText, Layers, ListChecks, Star, ArrowRight, Flame, BookMarked } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { NotificationMenu } from "@/components/notifications/notification-menu";
import { TagList } from "@/components/library/tag-list";
import { CreateMenu } from "@/components/layout/create-menu";

export function Topbar({ userName, unreadNotifications, studyStreak }: { userName: string; unreadNotifications: number; studyStreak: number }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [results, setResults] = useState<SearchResponse>({ notes: [], reviewers: [], quizzes: [] });
  const searchRef = useRef<HTMLFormElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo<SearchSuggestion[]>(() => [
    ...results.notes.map((item) => ({ ...item, type: "note" as const, href: `/notes/${item.id}` })),
    ...results.reviewers.map((item) => ({ ...item, type: "reviewer" as const, href: `/reviewers/${item.id}` })),
    ...results.quizzes.map((item) => ({ ...item, type: "quiz" as const, href: `/quizzes/${item.id}` })),
  ].slice(0, 10), [results]);

  useEffect(() => {
    if (!searchOpen) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const endpoint = query.trim() ? `/api/search?q=${encodeURIComponent(query.trim())}` : "/api/search?recommended=1";
        const response = await fetch(endpoint, { signal: controller.signal, cache: "no-store" });
        if (response.ok) setResults(await response.json());
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) setResults({ notes: [], reviewers: [], quizzes: [] });
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, query.trim() ? 180 : 0);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [query, searchOpen]);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!searchRef.current?.contains(event.target as Node)) setSearchOpen(false);
      if (!accountMenuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (selectedIndex >= 0 && suggestions[selectedIndex]) {
      router.push(suggestions[selectedIndex].href);
      setSearchOpen(false);
    } else if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      setSearchOpen(false);
    }
  }

  function openSuggestion(suggestion: SearchSuggestion) {
    setQuery(suggestion.title);
    setSearchOpen(false);
    router.push(suggestion.href);
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-line bg-paper/90 px-3 backdrop-blur sm:gap-3 sm:px-6">
      <Link href="/dashboard" aria-label="Memoria dashboard" title="Memoria" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-control text-accent-dark lg:hidden"><BookMarked className="h-5 w-5" /></Link>
      <form ref={searchRef} onSubmit={handleSearch} className="relative min-w-0 flex-1" role="search">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
        <input
          value={query}
          onFocus={() => setSearchOpen(true)}
          onChange={(e) => { setQuery(e.target.value); setSearchOpen(true); setSelectedIndex(-1); }}
          onKeyDown={(event) => {
            if (event.key === "Escape") { setSearchOpen(false); event.currentTarget.blur(); }
            else if (event.key === "ArrowDown") { event.preventDefault(); setSelectedIndex((current) => Math.min(suggestions.length - 1, current + 1)); }
            else if (event.key === "ArrowUp") { event.preventDefault(); setSelectedIndex((current) => Math.max(-1, current - 1)); }
          }}
          placeholder="Search Memories and study material…"
          role="combobox"
          aria-label="Search your study material"
          aria-expanded={searchOpen}
          aria-controls="search-suggestions"
          aria-autocomplete="list"
          className="h-9 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-sm placeholder:text-ink-faint focus:border-accent"
        />
        {searchOpen && (
          <div id="search-suggestions" role="listbox" className="absolute left-0 right-0 top-11 z-50 max-h-[min(28rem,70vh)] overflow-y-auto rounded-xl border border-line bg-surface p-2 shadow-card-hover">
            <div className="flex items-center justify-between px-2 py-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">{query.trim() ? "Best matches" : "Recommended for you"}</p>
              {searching && <span className="text-xs text-ink-faint">Searching…</span>}
            </div>
            {!searching && suggestions.length === 0 ? (
              <div className="p-3">
                <p className="text-sm text-ink-soft">{query.trim() ? "No quick matches. Try searching all results." : "Your library is empty. Import something to make it searchable."}</p>
                {!query.trim() && <Link href="/notes/import" onClick={() => setSearchOpen(false)} className="mt-2 inline-flex text-sm font-medium text-accent-dark hover:underline">Import your first Memory</Link>}
              </div>
            ) : suggestions.map((suggestion, index) => {
              const Icon = suggestion.type === "note" ? FileText : suggestion.type === "reviewer" ? Layers : ListChecks;
              return <button key={`${suggestion.type}-${suggestion.id}`} type="button" role="option" aria-selected={selectedIndex === index} onMouseEnter={() => setSelectedIndex(index)} onClick={() => openSuggestion(suggestion)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left ${selectedIndex === index ? "bg-ink/5" : "hover:bg-ink/[0.03]"}`}>
                <Icon className="h-4 w-4 shrink-0 text-accent-dark" />
                <div className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-ink">{suggestion.title}</span><span className="block text-xs capitalize text-ink-faint">{suggestion.type}</span><TagList tags={suggestion.tags.map(({ tag }) => tag)} className="mt-1" /></div>
                {suggestion.isFavorite && <Star className="h-3.5 w-3.5 fill-accent text-accent-dark" aria-label="Favorite" />}
              </button>;
            })}
            {query.trim() && <button type="submit" onMouseEnter={() => setSelectedIndex(-1)} className="mt-1 flex w-full items-center justify-between border-t border-line px-3 py-3 text-left text-sm font-medium text-ink hover:bg-ink/[0.03]"><span>Search all for “{query.trim()}”</span><ArrowRight className="h-4 w-4" /></button>}
            {!query.trim() && suggestions.length > 0 && <div className="mt-1 grid grid-cols-3 gap-1 border-t border-line pt-2">{[["Memories", "/notes"], ["Reviewers", "/reviewers"], ["Quizzes", "/quizzes"]].map(([label, href]) => <Link key={href} href={href} onClick={() => setSearchOpen(false)} className="rounded-md px-2 py-2 text-center text-xs text-ink-soft hover:bg-ink/5 hover:text-ink">Browse {label}</Link>)}</div>}
          </div>
        )}
      </form>

      <div className="flex shrink-0 items-center gap-3">
        <ThemeToggle className="hidden sm:inline-flex" />
        <CreateMenu />

        <Link
          href="/study"
          aria-label={`${studyStreak}-day study streak`}
          title={`${studyStreak}-day study streak`}
          className="hidden h-9 items-center gap-1.5 rounded-full border border-accent/40 bg-accent-soft px-2.5 text-sm font-semibold text-accent-dark transition-colors hover:border-accent hover:bg-accent/25 sm:inline-flex"
        >
          <Flame className="h-4 w-4 fill-accent text-accent-dark" />
          <span>{studyStreak}</span>
        </Link>

        <NotificationMenu initialUnreadCount={unreadNotifications} />

        <div ref={accountMenuRef} className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-action text-sm font-medium text-action-foreground"
            aria-label="Account menu"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            {userName.charAt(0).toUpperCase()}
          </button>
          {menuOpen && (
            <div role="menu" className="absolute right-0 top-11 w-48 rounded-lg border border-line bg-surface py-1 shadow-card-hover">
              <div className="border-b border-line px-3 py-2 text-sm text-ink-soft truncate">{userName}</div>
              <Link href="/settings" role="menuitem" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm text-ink hover:bg-ink/5">
                <UserIcon className="h-4 w-4" /> Settings
              </Link>
              <button
                role="menuitem"
                disabled={signingOut}
                onClick={async () => {
                  setMenuOpen(false);
                  setSigningOut(true);
                  await signOut({ redirect: false });
                  router.replace("/");
                  router.refresh();
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-danger hover:bg-danger/5"
              >
                <LogOut className="h-4 w-4" /> {signingOut ? "Signing out…" : "Sign out"}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

interface SearchItem { id: string; title: string; isFavorite?: boolean; tags: Array<{ tag: { id: string; name: string; color: string | null } }> }
interface SearchResponse { notes: SearchItem[]; reviewers: SearchItem[]; quizzes: SearchItem[] }
interface SearchSuggestion extends SearchItem { type: "note" | "reviewer" | "quiz"; href: string }
