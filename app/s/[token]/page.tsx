import { MemoryMark } from "@/components/layout/brand";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Users } from "lucide-react";
import { prisma } from "@/lib/db";
import { findNoteById } from "@/lib/notes-repo";
import { findReviewerById } from "@/lib/reviewers-repo";
import { MarkdownRenderer } from "@/components/markdown/renderer";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { quizChapterMarkdown } from "@/lib/books/document";
import type { QuizQuestion } from "@/lib/validation/quiz";

type SharedMemory = { title: string; description: string | null; content: string; kind: "Note" | "Study guide" | "Quiz"; ownerName: string };

async function getSharedMemory(token: string): Promise<SharedMemory | null> {
  const link = await prisma.publicResourceLink.findUnique({
    where: { token },
    select: { resourceId: true, resourceType: true, ownerId: true, owner: { select: { name: true } } },
  });
  if (!link) return null;
  const ownerName = link.owner.name ?? "a Memoria member";
  if (link.resourceType === "NOTE") {
    const note = await findNoteById(link.resourceId);
    if (!note || note.ownerId !== link.ownerId || note.archivedAt) return null;
    return { title: note.title, description: note.description, content: note.content, kind: "Note", ownerName };
  }
  if (link.resourceType === "REVIEWER") {
    const reviewer = await findReviewerById(link.resourceId);
    if (!reviewer || reviewer.ownerId !== link.ownerId || reviewer.archivedAt) return null;
    return { title: reviewer.title, description: reviewer.description, content: reviewer.content, kind: "Study guide", ownerName };
  }
  if (link.resourceType === "QUIZ") {
    const quiz = await prisma.quiz.findUnique({ where: { id: link.resourceId }, select: { ownerId: true, title: true, description: true, questions: true, archivedAt: true } });
    if (!quiz || quiz.ownerId !== link.ownerId || quiz.archivedAt) return null;
    return { title: quiz.title, description: quiz.description, content: quizChapterMarkdown(quiz.questions as unknown as QuizQuestion[]), kind: "Quiz", ownerName };
  }
  return null;
}

export async function generateMetadata(props: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await props.params;
  const shared = await getSharedMemory(token);
  if (!shared) return { title: "Shared Memory — Memoria" };
  return { title: shared.title + " — Memoria", description: shared.description ?? "Shared for viewing on Memoria." };
}

export default async function SharedMemoryPage(props: { params: Promise<{ token: string }> }) {
  const { token } = await props.params;
  const shared = await getSharedMemory(token);
  if (!shared) notFound();

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-4">
          <Link href="/" className="inline-flex items-center gap-2 font-display text-lg text-ink">
            <MemoryMark className="h-5 w-5 text-accent-dark" /> Memoria
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-10">
        <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-accent-dark"><Users className="h-4 w-4" aria-hidden="true" />Shared {shared.kind} · View only</p>
        <h1 className="mt-2 break-words font-display text-3xl text-ink">{shared.title}</h1>
        {shared.description && <p className="mt-2 text-sm text-ink-soft">{shared.description}</p>}
        <p className="mt-2 text-xs text-ink-faint">Shared by {shared.ownerName}</p>
        <article className="mt-8 rounded-card border border-line bg-surface p-6 sm:p-8">
          <MarkdownRenderer content={shared.content} />
        </article>
      </main>
    </div>
  );
}
