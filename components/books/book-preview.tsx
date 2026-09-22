"use client";
import { useEffect, useMemo, useState } from "react";
import { BookReader } from "@/components/books/book-reader";
import { bookForGroup, type BookDocument } from "@/lib/books/document";
import { Button } from "@/components/ui/button";

export function BookPreview({ id, revision, editing = false, subjectId, chapterId, updating = false }: { id: string; revision: string; editing?: boolean; subjectId?: string; chapterId?: string; updating?: boolean }) {
  const [book, setBook] = useState<BookDocument | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (updating) return;
    const controller = new AbortController(); setError(""); setLoading(true);
    void fetch(`/api/collections/${id}/document`, { signal: controller.signal }).then(async response => {
      const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Could not load the book. Try again.");
      if (!controller.signal.aborted) setBook(data.book);
    }).catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Could not load the book. Try again."); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, revision, retry, updating]);
  const visibleBook = useMemo(() => book ? bookForGroup(book, subjectId) : null, [book, subjectId]);
  return <div className="space-y-3">
    {error && <div className="card p-4"><p role="alert" className="text-sm text-danger">{error}</p><Button variant="outline" onClick={() => setRetry(value => value + 1)} className="mt-3">Try again</Button></div>}
    {(loading || updating) && book && <p role="status" className="text-xs text-ink-soft">Updating pages...</p>}
    {visibleBook ? <BookReader key={[editing ? "edit" : "read", subjectId ?? "all", chapterId ?? "cover"].join(":")} book={visibleBook} storageKey={id} canPersist={!editing} editing={editing} resumeChapter={chapterId} /> : !error && <p role="status" className="p-10 text-center text-sm text-ink-soft">Opening your book...</p>}
  </div>;
}
