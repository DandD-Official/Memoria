import type { BookBookmark } from "./notebooks";
export interface BookOutlineEntry { id: string; title: string; level: number; page: number }
export function visibleBookPages(page: number, total: number, spread: boolean): number[] {
  if (!total) return [];
  const current = Math.max(0, Math.min(total - 1, page));
  return spread && current > 0 && current + 1 < total ? [current, current + 1] : [current];
}
export function bookmarkPage(bookmark: BookBookmark, chapters: Record<string, number>, total: number): number {
  const start = bookmark.chapterId ? (chapters[bookmark.chapterId] ?? 1) - 1 : 0;
  return Math.max(0, Math.min(total - 1, start + bookmark.pageOffset));
}
