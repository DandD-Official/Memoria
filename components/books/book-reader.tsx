"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { renderBook, type RenderedBook } from "@/lib/books/render";
import type { BookDocument } from "@/lib/books/document";

export function BookReader({ book, resumeChapter, onChapterChange }: { book: BookDocument; resumeChapter?: string | null; onChapterChange?: (id: string) => void }) {
  const rendered = useRef<RenderedBook | null>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const paper = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [width, setWidth] = useState(794);
  const [height, setHeight] = useState(1123);
  const [zoom, setZoom] = useState("fit");
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false; let document: RenderedBook | null = null;
    setTotal(0); setError(""); setPage(0);
    void renderBook(book).then(result => {
      if (cancelled) { result.cleanup(); return; }
      document = result; rendered.current = result; setTotal(result.pages.length);
    }).catch(reason => { if (!cancelled) setError(reason instanceof Error ? reason.message : "Could not prepare the book. Try again."); });
    return () => { cancelled = true; document?.cleanup(); rendered.current = null; };
  }, [book, retry]);
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const observer = new ResizeObserver(entries => setWidth(Math.max(200, entries[0].contentRect.width - 32)));
    observer.observe(element); return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const item = rendered.current?.pages[page];
    if (!item || !paper.current) return;
    paper.current.replaceChildren(item.element.cloneNode(true)); setHeight(item.height);
    const chapter = Object.entries(rendered.current!.chapterPages).reverse().find(([, start]) => start <= page + 1);
    if (chapter) onChapterChange?.(chapter[0]);
  }, [page, total, onChapterChange]);
  const scale = zoom === "fit" ? Math.min(1, width / 794) : Number(zoom);
  function navigate(next: number) { setPage(next); viewport.current?.scrollTo({ top: 0, left: 0 }); }
  return <section className="book-reader" aria-label={`${book.title} book reader`}>
    <div className="book-reader-toolbar">
      <label className="flex min-w-0 flex-1 items-center gap-2 text-xs text-ink-soft"><span className="sr-only sm:not-sr-only">Go to</span><select aria-label="Book section" className="h-11 min-w-0 max-w-full rounded-control border border-line bg-surface px-3 text-sm" value={page} onChange={event => navigate(Number(event.target.value))} disabled={!total}>
        <option value={0}>Cover</option>{total > 1 && <option value={1}>{book.tocTitle}</option>}
        {book.chapters.map((chapter, index) => rendered.current?.chapterPages[chapter.id] && <option key={chapter.id} value={rendered.current.chapterPages[chapter.id] - 1}>{index + 1}. {chapter.title}</option>)}
        {total > 0 && page > 1 && !Object.values(rendered.current?.chapterPages ?? {}).includes(page + 1) && <option value={page}>Page {page + 1}</option>}
      </select></label>
      {resumeChapter && rendered.current?.chapterPages[resumeChapter] && <Button variant="ghost" size="sm" onClick={() => navigate(rendered.current!.chapterPages[resumeChapter] - 1)}><RotateCcw className="h-4 w-4" />Resume</Button>}
      <select aria-label="Page zoom" value={zoom} onChange={event => setZoom(event.target.value)} className="h-11 rounded-control border border-line bg-surface px-2 text-sm"><option value="fit">Fit page</option><option value="1">100%</option><option value="1.25">125%</option><option value="1.5">150%</option></select>
    </div>
    <div ref={viewport} className="book-reader-stage" tabIndex={0} aria-label="Book page. Use the page controls to continue." onKeyDown={event => { if (event.target !== event.currentTarget || !total) return; if (event.key === "PageDown" || event.key === "PageUp") { event.preventDefault(); navigate(Math.max(0, Math.min(total - 1, page + (event.key === "PageDown" ? 1 : -1)))); } }}>
      {!total && !error && <p className="p-10 text-center text-sm text-ink-soft" role="status">Preparing your book pages…</p>}
      {error && <div className="p-8"><p role="alert" className="text-sm text-danger">{error}</p><Button onClick={() => setRetry(value => value + 1)} variant="outline" className="mt-4">Try again</Button></div>}
      {total > 0 && <div className="book-reader-frame" style={{ width: 794 * scale, height: height * scale }}><div ref={paper} onClick={event => { const link = (event.target as HTMLElement).closest<HTMLElement>("[data-book-goto]"); const target = link && rendered.current?.chapterPages[link.dataset.bookGoto!]; if (target) { event.preventDefault(); navigate(target - 1); } }} style={{ width: 794, transform: `scale(${scale})`, transformOrigin: "top left" }} /></div>}
    </div>
    <div className="book-reader-toolbar"><Button variant="ghost" size="sm" disabled={!total || page === 0} onClick={() => navigate(page - 1)}><ChevronLeft className="h-4 w-4" />Previous</Button><p role="status" className="text-xs tabular-nums text-ink-soft">{total ? `Page ${page + 1} of ${total}` : "Preparing pages"}</p><Button variant="ghost" size="sm" disabled={!total || page >= total - 1} onClick={() => navigate(page + 1)}>Next<ChevronRight className="h-4 w-4" /></Button></div>
    <p className="px-4 pb-4 text-xs text-ink-faint">PDF and Word preserve these pages as images. Use JSON for editable content, or 100% zoom to read small details.</p>
  </section>;
}
