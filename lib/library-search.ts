import { prisma } from "@/lib/db";

export function emptyLibraryResults() {
  return { notes: [], reviewers: [], quizzes: [], diagrams: [], collections: [] };
}

/** Shared by the command palette and full search. Only return the caller's metadata. */
export async function searchLibrary(ownerId: string, query: string, take: number) {
  const text = query.trim();
  const match = { contains: text, mode: "insensitive" as const };
  const resourceFilter = {
    ownerId,
    archivedAt: null,
    ...(text ? { OR: [
      { title: match },
      { description: match },
      { tags: { some: { tag: { name: match } } } },
    ] } : {}),
  };
  const metadata = {
    id: true, title: true, description: true, updatedAt: true, isFavorite: true,
    tags: { select: { tag: { select: { id: true, name: true, color: true } } } },
  } as const;
  const orderBy = [{ isFavorite: "desc" as const }, { updatedAt: "desc" as const }];
  const [notes, reviewers, quizzes, diagrams, collections] = await Promise.all([
    prisma.note.findMany({
      where: { ...resourceFilter, ...(text ? { OR: [...resourceFilter.OR!, { originalFilename: match }] } : {}) },
      select: metadata, orderBy, take,
    }),
    prisma.reviewer.findMany({ where: resourceFilter, select: metadata, orderBy, take }),
    prisma.quiz.findMany({ where: resourceFilter, select: metadata, orderBy, take }),
    prisma.diagram.findMany({
      where: { ownerId, ...(text ? { title: match } : {}) },
      select: { id: true, title: true, updatedAt: true },
      orderBy: { updatedAt: "desc" }, take,
    }),
    prisma.shareCollection.findMany({
      where: { ownerId, ...(text ? { OR: [{ title: match }, { subtitle: match }, { description: match }] } : {}) },
      select: { id: true, title: true, description: true, updatedAt: true, isFavorite: true },
      orderBy, take,
    }),
  ]);
  return { notes, reviewers, quizzes, diagrams, collections };
}
