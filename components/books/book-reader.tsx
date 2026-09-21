"use client";
import { useEffect, useRef, useState } from "react";
import { Bookmark, ChevronLeft, ChevronRight, ListTree } from "lucide-react";
import { Button } from "@/components/ui/button";
import { bookContents } from "@/lib/books/contents";
import { BookQuiz } from "./book-quiz";
import { renderBook, type RenderedBook } from "@/lib/books/render";
import type { BookDocument } from "@/lib/books/document";
import { readBookmarks, type BookBookmark } from "@/lib/books/notebooks";
import { bookmarkPage, visibleBookPages } from "@/lib/books/reader-state";

export function BookReader({ book, storageKey, canPersist = false, resumeChapter, onChapterChange }: { book: BookDocument; storageKey?: string; canPersist?: boolean; resumeChapter?: string | null; onChapterChange?: (id: string) => void }) {
  const rendered = useRef<RenderedBook | null>(null), viewport = useRef<HTMLDivElement>(null), papers = useRef<HTMLDivElement>(null);
  const callback = useRef(onChapterChange); callback.current = onChapterChange;
  const [page, setPage] = useState(0), [total, setTotal] = useState(0), [width, setWidth] = useState(794);
  const [spread, setSpread] = useState(false), [contents, setContents] = useState(true), [practice, setPractice] = useState(false);
  const [error, setError] = useState(""), [retry, setRetry] = useState(0), [bookmarks, setBookmarks] = useState<BookBookmark[]>([]);
  const [saving, setSaving] = useState(false), [saveError, setSaveError] = useState("");
  useEffect(() => {
    let cancelled = false; let result: RenderedBook | null = null;
    const controller = new AbortController();
    setTotal(0); setError(""); setPage(0); setPractice(false); setBookmarks([]);
    void renderBook(book).then(async document => {
      if (cancelled) { document.cleanup(); return; }
      result = document; rendered.current = document;
      let chapter = resumeChapter;
      try {
        if (canPersist && storageKey) {
          const response = await fetch("/api/collections/" + storageKey + "/progress", { signal: controller.signal });
          if (!response.ok) throw new Error("Could not load bookmarks.");
          const data = await response.json();
          if (!cancelled) setBookmarks(readBookmarks(data.bookmarks).filter(mark => !mark.chapterId || document.chapterPages[mark.chapterId]));
          chapter = data.lastItemId ?? chapter;
        } else if (storageKey && !cancelled) setBookmarks(readBookmarks(JSON.parse(localStorage.getItem("memoria-bookmarks-guest:" + storageKey) ?? "[]")));
      } catch { if (!cancelled) setSaveError("Could not load saved reading progress."); }
      if (!cancelled) { setTotal(document.pages.length); if (chapter && document.chapterPages[chapter]) setPage(document.chapterPages[chapter] - 1); }
    }).catch(reason => { if (!cancelled) setError(reason instanceof Error ? reason.message : "Could not prepare pages."); });
    return () => { cancelled = true; controller.abort(); result?.cleanup(); rendered.current = null; };
  }, [book, retry, storageKey, canPersist, resumeChapter]);
  useEffect(() => {
    const element = viewport.current; if (!element) return;
    const observer = new ResizeObserver(entries => setWidth(entries[0].contentRect.width)); observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const paired = spread && width >= 700;
  const visible = visibleBookPages(page, total, paired);
  const scale = Math.min(1, Math.max(0.1, (width - (visible.length > 1 ? 20 : 0)) / (794 * Math.max(1, visible.length))));
  const chapterId = total ? Object.entries(rendered.current?.chapterPages ?? {}).reverse().find(([, start]) => start <= page + 1)?.[0] : undefined;
  const chapter = book.chapters.find(item => item.id === chapterId);
  useEffect(() => {
    if (!papers.current || !rendered.current) return;
    papers.current.replaceChildren();
    for (const index of visibleBookPages(page, total, paired)) {
      const source = rendered.current.pages[index]; if (!source) continue;
      const leaf = document.createElement("div"); leaf.className = "reading-leaf";
      leaf.style.width = 794 * scale + "px"; leaf.style.height = source.height * scale + "px";
      const clone = source.element.cloneNode(true) as HTMLElement;
      clone.style.transform = "scale(" + scale + ")"; clone.style.transformOrigin = "top left";
      leaf.append(clone); papers.current.append(leaf);
    }
  }, [page, total, paired, scale, practice]);
  useEffect(() => {
    if (!chapterId) return;
    callback.current?.(chapterId);
    if (canPersist && storageKey) void fetch("/api/collections/" + storageKey + "/progress", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lastItemId: chapterId }) }).catch(() => {});
  }, [chapterId, canPersist, storageKey]);
  function navigate(next: number) { setPractice(false); setPage(Math.max(0, Math.min(total - 1, next))); }
  async function saveMarks(next: BookBookmark[]) {
    const previous = bookmarks; setBookmarks(next); setSaving(true); setSaveError("");
    try {
      if (canPersist && storageKey) {
        const response = await fetch("/api/collections/" + storageKey + "/progress", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bookmarks: next }) });
        if (!response.ok) throw new Error("Could not save bookmarks. Please try again.");
      } else if (storageKey) localStorage.setItem("memoria-bookmarks-guest:" + storageKey, JSON.stringify(next));
    } catch (reason) { setBookmarks(previous); setSaveError(reason instanceof Error ? reason.message : "Could not save bookmarks."); }
    finally { setSaving(false); }
  }
  const currentMark = bookmarks.find(mark => bookmarkPage(mark, rendered.current?.chapterPages ?? {}, total) === page);
  return <section aria-label={book.title + " reader"} className="space-y-4">
    <div className="flex flex-wrap items-center gap-2 border-b border-line pb-3">
      <Button variant="ghost" size="sm" aria-expanded={contents} onClick={() => setContents(!contents)}><ListTree className="h-4 w-4" />Contents</Button>
      <div className="flex flex-1 gap-1"><Button size="sm" variant={!spread ? "secondary" : "ghost"} aria-pressed={!spread} onClick={() => setSpread(false)}>One page</Button><Button size="sm" variant={spread ? "secondary" : "ghost"} aria-pressed={spread} onClick={() => setSpread(true)}>Two pages</Button></div>
      <Button variant="ghost" size="sm" disabled={!total || saving || (!currentMark && bookmarks.length >= 100)} aria-pressed={!!currentMark} onClick={() => void saveMarks(currentMark ? bookmarks.filter(mark => mark.id !== currentMark.id) : [...bookmarks, { id: crypto.randomUUID(), chapterId: chapterId ?? null, pageOffset: page - (chapterId ? (rendered.current!.chapterPages[chapterId] - 1) : 0), label: (chapter?.title ?? book.title).slice(0, 170) + " · Page " + (page + 1) }])}><Bookmark className={"h-4 w-4 " + (currentMark ? "fill-current" : "")} />{currentMark ? "Bookmarked" : "Bookmark"}</Button>
    </div>
    {saveError && <p role="alert" className="text-sm text-danger">{saveError}</p>}
    <div className={contents ? "grid items-start gap-5 lg:grid-cols-[220px_minmax(0,1fr)]" : "min-w-0"}>
      {contents && <aside className="max-h-64 overflow-y-auto lg:sticky lg:top-24 lg:max-h-[75dvh]" aria-label="Contents and bookmarks">
        <button className="min-h-11 w-full text-left text-sm" onClick={() => navigate(0)}>Cover</button>
        {bookContents(book).map(({ chapter: item, groupStart, groupTitle, number }, index) => <div key={item.id}>{groupStart && <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-ink-soft">{groupTitle}</p>}<button disabled={!total} aria-current={chapterId === item.id ? "location" : undefined} className={"min-h-11 w-full rounded-control px-2 py-2 text-left text-sm " + (chapterId === item.id ? "bg-accent-soft font-semibold" : "hover:bg-surface-muted")} onClick={() => navigate((rendered.current?.chapterPages[item.id] ?? 1) - 1)}>{number}. {item.title}</button>{chapterId === item.id && rendered.current?.outline.filter(heading => heading.page >= rendered.current!.chapterPages[item.id] - 1 && heading.page < (rendered.current!.chapterPages[book.chapters[index + 1]?.id] ?? total + 1) - 1).map(heading => <button key={heading.id} className="block min-h-9 w-full border-l border-line py-1 pl-3 text-left text-xs text-ink-soft hover:text-ink" onClick={() => navigate(heading.page)}>{heading.title}</button>)}</div>)}
        {!!bookmarks.length && <div className="mt-5 border-t border-line pt-3"><h3 className="mb-2 text-sm font-semibold">Bookmarks</h3>{bookmarks.map(mark => <div key={mark.id} className="flex items-center gap-1"><button className="min-h-11 min-w-0 flex-1 truncate text-left text-xs" onClick={() => navigate(bookmarkPage(mark, rendered.current?.chapterPages ?? {}, total))}>{mark.label}</button><Button variant="ghost" size="sm" disabled={saving} aria-label={"Remove bookmark " + mark.label} onClick={() => void saveMarks(bookmarks.filter(item => item.id !== mark.id))}>×</Button></div>)}</div>}
      </aside>}
      <div ref={viewport} className="min-w-0">
        {chapter?.quiz && <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-control border border-line bg-surface p-3"><span className="text-sm">{chapter.title}</span><Button size="sm" variant="outline" onClick={() => setPractice(!practice)}>{practice ? "Back to pages" : "Review or take exam"}</Button></div>}
        {practice && chapter?.quiz ? <BookQuiz key={chapter.id} title={chapter.title} questions={chapter.quiz} /> : <div tabIndex={0} aria-label="Reading pages" onKeyDown={event => { if (event.target !== event.currentTarget) return; if (["PageDown", "PageUp"].includes(event.key)) { event.preventDefault(); navigate(page + (event.key === "PageDown" ? visible.length : paired && page > 1 ? -2 : -1)); } }}>
          {!total && !error && <p role="status" className="p-10 text-center text-sm">Preparing pages…</p>}
          {error && <div role="alert"><p>{error}</p><Button onClick={() => setRetry(retry + 1)}>Try again</Button></div>}
          <div ref={papers} className="reading-spread" onClick={event => { const link = (event.target as HTMLElement).closest<HTMLElement>("[data-book-goto]"); const target = link && rendered.current?.chapterPages[link.dataset.bookGoto!]; if (target) { event.preventDefault(); navigate(target - 1); } }} />
        </div>}
      </div>
    </div>
    <div className="flex items-center justify-between border-t border-line pt-3"><Button variant="ghost" size="sm" disabled={!total || !page} onClick={() => navigate(page - (paired && page > 1 ? 2 : 1))}><ChevronLeft className="h-4 w-4" />Previous</Button><p role="status" className="text-xs text-ink-soft">{total ? "Page " + (page + 1) + (visible.length > 1 ? "–" + (page + 2) : "") + " of " + total : "Preparing pages"}</p><Button variant="ghost" size="sm" disabled={!total || page + visible.length >= total} onClick={() => navigate(page + visible.length)}>Next<ChevronRight className="h-4 w-4" /></Button></div>
  </section>;
}
