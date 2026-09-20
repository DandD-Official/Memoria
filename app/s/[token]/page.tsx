import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Users, BookMarked } from "lucide-react";
import { prisma } from "@/lib/db";
import { findNoteById } from "@/lib/notes-repo";
import { MarkdownRenderer } from "@/components/markdown/renderer";
import { ThemeToggle } from "@/components/layout/theme-toggle";

async function getSharedMemory(token: string) {
  const link = await prisma.publicResourceLink.findUnique({
    where: { token },
    select: { resourceId: true, resourceType: true, ownerId: true, owner: { select: { name: true } } },
  });
  if (!link || link.resourceType !== "NOTE") return null;
  const note = await findNoteById(link.resourceId);
  if (!note || note.ownerId !== link.ownerId || note.archivedAt) return null;
  return { note, ownerName: link.owner.name };
}

export async function generateMetadata(props: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await props.params;
  const shared = await getSharedMemory(token);
  if (!shared) return { title: "Shared Note — Memoria" };
  return { title: `${shared.note.title} — Memoria`, description: shared.note.description ?? "A note shared for viewing on Memoria." };
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
            <BookMarked className="h-5 w-5 text-accent-dark" /> Memoria
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-10">
        <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-accent-dark"><Users className="h-4 w-4" aria-hidden="true" />Shared Note · View only</p>
        <h1 className="mt-2 break-words font-display text-3xl text-ink">{shared.note.title}</h1>
        {shared.note.description && <p className="mt-2 text-sm text-ink-soft">{shared.note.description}</p>}
        <p className="mt-2 text-xs text-ink-faint">Shared by {shared.ownerName}</p>
        <article className="mt-8 rounded-card border border-line bg-surface p-6 sm:p-8">
          <MarkdownRenderer content={shared.note.content} />
        </article>
      </main>
    </div>
  );
}
