"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, BookOpen, Plus, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { PageActions, PageDescription, PageHeader, PageHeaderContent, PageShell, PageTitle } from "@/components/ui/page";
import { formatRelativeTime } from "@/lib/utils";

interface CollectionSummary {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  slug: string;
  isPublished: boolean;
  isFavorite: boolean;
  updatedAt: string;
  items: Array<{ id: string }>;
  progress: Array<{ lastItemId: string | null; lastAccessedAt: string | Date }>;
  _count: { items: number; feedback: number; members: number };
}

/**
 * Books currently read/write through the legacy ShareCollection API. This is
 * an intentional compatibility boundary until the dedicated Book migration.
 */
export function CollectionsList({ initialCollections, initiallyCreating = false }: { initialCollections: CollectionSummary[]; initiallyCreating?: boolean }) {
  const [books, setBooks] = useState(initialCollections);
  const [creating, setCreating] = useState(initiallyCreating);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!title.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/collections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: title.trim() }) });
      const data = await response.json().catch(() => null);
      if (!data) setError("The server sent back something unexpected. Please try again.");
      else if (!response.ok) setError(data.error ?? "Couldn't create the Book.");
      else {
        setBooks((current) => [{ ...data.collection, updatedAt: new Date(data.collection.updatedAt).toISOString(), items: [], progress: [], _count: { items: 0, feedback: 0, members: 0 } }, ...current]);
        setTitle("");
        setCreating(false);
      }
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleFavorite(id: string, current: boolean) {
    setBooks((rows) => rows.map((book) => book.id === id ? { ...book, isFavorite: !current } : book));
    const response = await fetch(`/api/collections/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isFavorite: !current }) });
    if (!response.ok) setBooks((rows) => rows.map((book) => book.id === id ? { ...book, isFavorite: current } : book));
  }

  return (
    <PageShell className="max-w-5xl">
      <PageHeader>
        <PageHeaderContent>
          <PageTitle>Books</PageTitle>
          <PageDescription>Arrange Memories into a focused reading and study sequence.</PageDescription>
        </PageHeaderContent>
        <PageActions><Button onClick={() => setCreating((value) => !value)} className="w-full sm:w-auto"><Plus className="h-4 w-4" /> New Book</Button></PageActions>
      </PageHeader>

      {creating && (
        <section className="card animate-panel-in p-5" aria-labelledby="new-book-heading">
          <h2 id="new-book-heading" className="section-heading">Create a Book</h2>
          <div className="mt-4">
            <Label htmlFor="new-book-title">Book title</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input id="new-book-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Biology Midterm" onKeyDown={(event) => event.key === "Enter" && void handleCreate()} autoFocus />
              <Button onClick={() => void handleCreate()} loading={saving} disabled={!title.trim()}>Create Book</Button>
            </div>
            {error && <p className="mt-2 text-sm text-danger" role="alert">{error}</p>}
          </div>
        </section>
      )}

      {books.length === 0 ? (
        <EmptyState icon={BookOpen} title="Create your first Book" description="Bring related Memories together and choose the order you want to read them." actionLabel="Create a Book" onAction={() => setCreating(true)} />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {books.map((book) => {
            const lastItemId = book.progress[0]?.lastItemId;
            const chapter = lastItemId ? book.items.findIndex((item) => item.id === lastItemId) + 1 : 0;
            return (
            <article key={book.id} className="group relative min-w-0">
              <Link href={`/books/${book.id}`} className="block rounded-[1rem] focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2">
                <div className="relative aspect-[4/3] overflow-hidden rounded-[1rem] border border-line-strong bg-action p-2 shadow-card transition-transform duration-200 group-hover:-translate-y-1 group-hover:shadow-card-hover">
                  <div className="absolute inset-y-2 left-4 w-3 rounded-full bg-ink/20 blur-[1px]" aria-hidden="true" />
                  <div className="flex h-full flex-col justify-between rounded-[0.65rem] border border-action-foreground/20 bg-action px-6 py-5 text-action-foreground">
                    <div><p className="text-[0.6rem] font-semibold uppercase tracking-[0.24em] text-action-foreground/70">Memoria Book</p><h2 className="mt-7 line-clamp-3 font-display text-2xl leading-tight">{book.title}</h2>{book.subtitle && <p className="mt-2 line-clamp-2 font-display text-sm italic text-action-foreground/80">{book.subtitle}</p>}</div>
                    <div className="flex items-end justify-between border-t border-action-foreground/25 pt-3 text-[0.68rem] text-action-foreground/75"><span>{book._count.items} chapter{book._count.items === 1 ? "" : "s"}</span><ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></div>
                  </div>
                </div>
                <div className="px-1 pt-3"><p className="line-clamp-2 text-sm leading-relaxed text-ink-soft">{book.description || "Open this Book and begin shaping its chapters."}</p><div className="mt-2 flex items-center justify-between gap-3 text-xs text-ink-faint"><span>{chapter > 0 ? `Continue · Chapter ${chapter}` : formatRelativeTime(new Date(book.updatedAt))}</span><span>{book._count.members > 0 ? `${book._count.members} people` : book.isPublished ? "Link shared" : "Only you"}</span></div></div>
              </Link>
              <button type="button" onClick={() => void toggleFavorite(book.id, book.isFavorite)} className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface/90 text-accent-dark shadow-sm backdrop-blur transition-colors hover:bg-surface" aria-label={book.isFavorite ? `Remove ${book.title} from favorites` : `Add ${book.title} to favorites`}><Star className={`h-4 w-4 ${book.isFavorite ? "fill-current" : ""}`} /></button>
            </article>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
