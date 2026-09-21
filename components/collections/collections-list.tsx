"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, BookOpen, Plus, Star } from "lucide-react";
import { MemoryMark } from "@/components/layout/brand";
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
export function CollectionsList({ initialCollections, initiallyCreating = false, kind = "BOOK" }: { initialCollections: CollectionSummary[]; initiallyCreating?: boolean; kind?: "BOOK" | "NOTEBOOK" }) {
  const router = useRouter();
  const label = kind === "NOTEBOOK" ? "Notebook" : "Book";
  const base = kind === "NOTEBOOK" ? "/notebooks" : "/books";
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
      const response = await fetch("/api/collections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: title.trim(), kind }) });
      const data = await response.json().catch(() => null);
      if (!data) setError("The server sent back something unexpected. Please try again.");
      else if (!response.ok) setError(data.error ?? "Couldn't create the Book.");
      else {
        setBooks((current) => [{ ...data.collection, updatedAt: new Date(data.collection.updatedAt).toISOString(), items: [], progress: [], _count: { items: 0, feedback: 0, members: 0 } }, ...current]);
        router.push(`${base}/${data.collection.id}`);
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
          <PageTitle>{label}s</PageTitle>
          <PageDescription>{kind === "NOTEBOOK" ? "Organize memories under your own titles. Read, practice and share them together." : "Arrange memories into a focused reading and study sequence."}</PageDescription>
        </PageHeaderContent>
        <PageActions><Button onClick={() => setCreating((value) => !value)} className="w-full sm:w-auto"><Plus className="h-4 w-4" /> New {label}</Button></PageActions>
      </PageHeader>

      {creating && (
        <section className="card animate-panel-in p-5" aria-labelledby="new-book-heading">
          <h2 id="new-book-heading" className="section-heading">Create a {label}</h2>
          <div className="mt-4">
            <Label htmlFor="new-book-title">{label} title</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input id="new-book-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Biology Midterm" onKeyDown={(event) => event.key === "Enter" && void handleCreate()} autoFocus />
              <Button onClick={() => void handleCreate()} loading={saving} disabled={!title.trim()}>Create {label}</Button>
            </div>
            {error && <p className="mt-2 text-sm text-danger" role="alert">{error}</p>}
          </div>
        </section>
      )}

      {books.length === 0 ? (
        <EmptyState icon={BookOpen} title={`Create your first ${label.toLowerCase()}`} description="Bring related notes together and choose the order you want to read them." actionLabel={"Create a " + label.toLowerCase()} onAction={() => setCreating(true)} />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {books.map((book) => {
            const lastItemId = book.progress[0]?.lastItemId;
            const chapter = lastItemId ? book.items.findIndex((item) => item.id === lastItemId) + 1 : 0;
            return (
            <article key={book.id} className="group relative min-w-0">
              <Link href={`${base}/${book.id}`} className="block rounded-[1rem] focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2">
                <div className={`book-thumbnail ${kind === "NOTEBOOK" ? "notebook-cover" : ""}`}>
                  <div className="book-thumbnail-brand"><MemoryMark /><span>memoria.</span></div>
                  <div className="book-thumbnail-orbits" aria-hidden="true"><i /><i /><i /></div>
                  <div className="book-thumbnail-title"><p>A collection of connected ideas</p><h2>{book.title}</h2>{book.subtitle && <span>{book.subtitle}</span>}</div>
                  <div className="book-thumbnail-footer"><span>{book._count.items} chapter{book._count.items === 1 ? "" : "s"}</span><ArrowUpRight className="h-4 w-4" /></div>
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
