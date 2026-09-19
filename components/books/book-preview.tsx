"use client";
import { useEffect, useState } from "react";
import { BookReader } from "@/components/books/book-reader";
import type { BookDocument } from "@/lib/books/document";
import { Button } from "@/components/ui/button";

export function BookPreview({ id, revision }: { id: string; revision: string }) {
  const [book, setBook] = useState<BookDocument | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setBook(null); setError("");
    void fetch(`/api/collections/${id}/document`, { signal: controller.signal }).then(async response => {
      const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Could not load the book. Try again.");
      if (!controller.signal.aborted) setBook(data.book);
    }).catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Could not load the book. Try again."); });
    return () => controller.abort();
  }, [id, revision, retry]);
  if (error) return <div className="card p-6"><p role="alert" className="text-sm text-danger">{error}</p><Button variant="outline" onClick={() => setRetry(value => value + 1)} className="mt-4">Try again</Button></div>;
  return book ? <BookReader book={book} /> : <p role="status" className="p-10 text-center text-sm text-ink-soft">Opening your book…</p>;
}
