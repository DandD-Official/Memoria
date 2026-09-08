import { BookOpen, Star } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { EmptyState } from "@/components/ui/empty-state";
import { PageDescription, PageHeader, PageHeaderContent, PageShell, PageTitle, SectionHeader } from "@/components/ui/page";
import { ResourceCard } from "@/components/library/resource-card";
import { TagList } from "@/components/library/tag-list";
import { formatRelativeTime } from "@/lib/utils";

export default async function FavoritesPage() {
  const user = await requireUser();
  const [books, notes, reviewers, quizzes] = await Promise.all([
    prisma.shareCollection.findMany({ where: { ownerId: user.id, isFavorite: true }, orderBy: { updatedAt: "desc" }, select: { id: true, title: true, subtitle: true, description: true, updatedAt: true, _count: { select: { items: true } } } }),
    prisma.note.findMany({ where: { ownerId: user.id, archivedAt: null, isFavorite: true }, orderBy: { updatedAt: "desc" }, select: { id: true, title: true, description: true, originalFilename: true, updatedAt: true, tags: { select: { tag: { select: { id: true, name: true, color: true } } } } } }),
    prisma.reviewer.findMany({ where: { ownerId: user.id, archivedAt: null, isFavorite: true }, orderBy: { updatedAt: "desc" }, select: { id: true, title: true, description: true, style: true, updatedAt: true, tags: { select: { tag: { select: { id: true, name: true, color: true } } } } } }),
    prisma.quiz.findMany({ where: { ownerId: user.id, archivedAt: null, isFavorite: true }, orderBy: { updatedAt: "desc" }, select: { id: true, title: true, description: true, mode: true, updatedAt: true, tags: { select: { tag: { select: { id: true, name: true, color: true } } } } } }),
  ]);
  const total = books.length + notes.length + reviewers.length + quizzes.length;

  return (
    <PageShell className="max-w-5xl">
      <PageHeader>
        <PageHeaderContent><PageTitle>Favorites</PageTitle><PageDescription>The Memories and study resources you want close at hand.</PageDescription></PageHeaderContent>
      </PageHeader>

      {total === 0 ? (
        <EmptyState icon={Star} title="No favorites yet" description="Favorite a Book, Memory, reviewer, or quiz and it will appear here." actionLabel="Browse Books" actionHref="/books" />
      ) : (
        <div className="space-y-8">
          {books.length > 0 && <section><SectionHeader title="Books" description={`${books.length} favorite ${books.length === 1 ? "Book" : "Books"}`} /><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{books.map((book) => <ResourceCard key={book.id} href={`/books/${book.id}`} kind="book" title={book.title} description={book.subtitle || book.description} badge={`${book._count.items} chapters`} meta={formatRelativeTime(book.updatedAt)} favorite><BookOpen className="h-4 w-4 text-accent-dark" /></ResourceCard>)}</div></section>}
          {notes.length > 0 && <section><SectionHeader title="Memories" description={`${notes.length} saved ${notes.length === 1 ? "Memory" : "Memories"}`} /><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{notes.map((note) => <ResourceCard key={note.id} href={`/notes/${note.id}`} kind="note" title={note.title} description={note.description || note.originalFilename} meta={formatRelativeTime(note.updatedAt)} favorite><TagList tags={note.tags.map(({ tag }) => tag)} /></ResourceCard>)}</div></section>}
          {reviewers.length > 0 && <section><SectionHeader title="Reviewers" /><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{reviewers.map((reviewer) => <ResourceCard key={reviewer.id} href={`/reviewers/${reviewer.id}`} kind="reviewer" title={reviewer.title} description={reviewer.description} badge={reviewer.style} meta={formatRelativeTime(reviewer.updatedAt)} favorite><TagList tags={reviewer.tags.map(({ tag }) => tag)} /></ResourceCard>)}</div></section>}
          {quizzes.length > 0 && <section><SectionHeader title="Quizzes" /><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{quizzes.map((quiz) => <ResourceCard key={quiz.id} href={`/quizzes/${quiz.id}`} kind="quiz" title={quiz.title} description={quiz.description} badge={quiz.mode.replace("_", " ")} meta={formatRelativeTime(quiz.updatedAt)} favorite><TagList tags={quiz.tags.map(({ tag }) => tag)} /></ResourceCard>)}</div></section>}
        </div>
      )}
    </PageShell>
  );
}
