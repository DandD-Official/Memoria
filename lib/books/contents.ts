import type { BookDocument } from "./document";

/** Stable keys keep identically named titles separate. */
export function bookContents(book: BookDocument) {
  let previous: string | undefined, groupIndex = 0, localIndex = 0;
  return book.chapters.map((chapter, index) => {
    const groupKey = book.kind === "NOTEBOOK" ? chapter.subjectId ?? chapter.subjectTitle ?? "unfiled" : "";
    const groupStart = book.kind === "NOTEBOOK" && groupKey !== previous;
    if (groupStart) { groupIndex++; localIndex = 0; }
    localIndex++; previous = groupKey;
    return { chapter, groupKey, groupStart, groupIndex, groupTitle: chapter.subjectTitle ?? "Unfiled", number: book.kind === "NOTEBOOK" ? groupIndex + "." + localIndex : String(index + 1).padStart(2, "0") };
  });
}
