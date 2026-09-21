import { z } from "zod";

export const subjectsSchema = z.array(z.object({ id: z.string().min(1).max(80), title: z.string().trim().min(1).max(120) }).strict()).max(50)
  .refine(rows => new Set(rows.map(row => row.id)).size === rows.length, "Subject IDs must be unique.");
export type NotebookSubject = z.infer<typeof subjectsSchema>[number];
export const readSubjects = (value: unknown): NotebookSubject[] => subjectsSchema.safeParse(value).data ?? [];
export const bookmarksSchema = z.array(z.object({
  id: z.string().min(1).max(100), chapterId: z.string().max(100).nullable(),
  pageOffset: z.number().int().min(0).max(10000), label: z.string().trim().min(1).max(200),
}).strict()).max(100).refine(rows => new Set(rows.map(row => row.id)).size === rows.length, "Bookmark IDs must be unique.");
export type BookBookmark = z.infer<typeof bookmarksSchema>[number];
export const readBookmarks = (value: unknown): BookBookmark[] => bookmarksSchema.safeParse(value).data ?? [];

export function subjectOrder<T extends { subjectId?: string | null }>(items: T[], subjects: NotebookSubject[]): T[] {
  const rank = new Map(subjects.map((subject, index) => [subject.id, index]));
  return [...items].sort((a, b) => (rank.get(a.subjectId ?? "") ?? subjects.length) - (rank.get(b.subjectId ?? "") ?? subjects.length));
}
