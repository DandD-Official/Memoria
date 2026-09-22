"use client";
import { useEffect, useState } from "react";
import { DocumentReader } from "@/components/library/document-reader";
import { Button } from "@/components/ui/button";
import { bookContents } from "@/lib/books/contents";
import type { BookDocument } from "@/lib/books/document";
import { BookQuiz } from "./book-quiz";

export function MemoryReader({ book, storageKey, canPersist, resumeChapter, onChapterChange }: { book: BookDocument; storageKey?: string; canPersist?: boolean; resumeChapter?: string | null; onChapterChange?: (id: string) => void }) {
  const entries = bookContents(book);
  const [id, setId] = useState(resumeChapter ?? entries[0]?.chapter.id);
  const [error, setError] = useState("");
  const index = Math.max(0, entries.findIndex(entry => entry.chapter.id === id));
  const chapter = entries[index]?.chapter;
  useEffect(() => {
    if (!chapter) return;
    onChapterChange?.(chapter.id);
    if (!canPersist || !storageKey) return;
    const controller = new AbortController();
    setError("");
    void fetch("/api/collections/" + storageKey + "/progress", { method: "PATCH", signal: controller.signal, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lastItemId: chapter.id }) }).then(response => { if (!response.ok) throw new Error(); }).catch(() => { if (!controller.signal.aborted) setError("Could not save reading progress."); });
    return () => controller.abort();
  }, [chapter, canPersist, storageKey, onChapterChange]);
  if (!chapter) return <p className="p-6 text-ink-soft">Add a memory to start reading.</p>;
  return <section aria-label="Read memories separately" className="space-y-6">
    <label className="block text-sm font-medium">Memory<select className="mt-2 min-h-11 w-full rounded-control border border-line bg-surface px-3" value={chapter.id} onChange={event => setId(event.target.value)}>{entries.map(({ chapter: item, number }) => <option key={item.id} value={item.id}>{item.subjectTitle ? item.subjectTitle + " / " : ""}{number}. {item.title}</option>)}</select></label>
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    <div key={chapter.id} className="rounded-card border border-line bg-surface p-5 sm:p-8">
      <header className="mb-6"><p className="text-sm text-ink-soft">Memory {index + 1} of {entries.length}{chapter.subjectTitle ? " ? " + chapter.subjectTitle : ""}</p><h2 className="mt-2 font-display text-3xl">{chapter.title}</h2>{chapter.description && <p className="mt-2 text-ink-soft">{chapter.description}</p>}</header>
      {chapter.quiz ? <BookQuiz title={chapter.title} questions={chapter.quiz} /> : <DocumentReader content={chapter.content} kind={chapter.kind === "REVIEWER" ? "reviewer" : "note"} resolvedAssets={book.assets} />}
    </div>
    <nav aria-label="Memory navigation" className="flex justify-between gap-3"><Button variant="outline" disabled={index === 0} onClick={() => setId(entries[index - 1].chapter.id)}>Previous memory</Button><Button variant="outline" disabled={index === entries.length - 1} onClick={() => setId(entries[index + 1].chapter.id)}>Next memory</Button></nav>
  </section>;
}
