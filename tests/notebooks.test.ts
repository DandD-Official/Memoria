import { describe, expect, it } from "vitest";
import { subjectsSchema, bookmarksSchema, subjectOrder } from "@/lib/books/notebooks";
import { bookmarkPage, visibleBookPages } from "@/lib/books/reader-state";
import { chapterBody, collectionBookDocument } from "@/lib/books/document";
import type { PublicCollection } from "@/lib/share-collections-repo";

describe("notebook organization and reading", () => {
  it("orders memories by subjects without changing order within a subject", () => {
    const items = [{ id: "a", subjectId: "math" }, { id: "b", subjectId: null }, { id: "c", subjectId: "biology" }, { id: "d", subjectId: "math" }];
    expect(subjectOrder(items, [{ id: "biology", title: "Biology" }, { id: "math", title: "Math" }]).map(item => item.id)).toEqual(["c", "a", "d", "b"]);
    expect(items.map(item => item.id)).toEqual(["a", "b", "c", "d"]);
  });
  it("rejects duplicate subjects, blank titles, and invalid bookmark positions", () => {
    expect(subjectsSchema.safeParse([{ id: "s", title: "Math" }, { id: "s", title: "Biology" }]).success).toBe(false);
    expect(subjectsSchema.safeParse([{ id: "s", title: "  " }]).success).toBe(false);
    expect(bookmarksSchema.safeParse([{ id: "b", chapterId: null, pageOffset: -1, label: "Page" }]).success).toBe(false);
  });
  it("shows the cover alone and never adds a nonexistent second page", () => {
    expect(visibleBookPages(0, 6, true)).toEqual([0]);
    expect(visibleBookPages(1, 6, true)).toEqual([1, 2]);
    expect(visibleBookPages(5, 6, true)).toEqual([5]);
    expect(visibleBookPages(2, 6, false)).toEqual([2]);
    expect(visibleBookPages(0, 0, true)).toEqual([]);
  });
  it("keeps bookmarks relative to chapters after reordering", () => {
    const mark = { id: "b", chapterId: "chapter", pageOffset: 2, label: "Remember this" };
    expect(bookmarkPage(mark, { chapter: 4 }, 12)).toBe(5);
    expect(bookmarkPage(mark, { chapter: 8 }, 12)).toBe(9);
    expect(bookmarkPage(mark, { chapter: 8 }, 9)).toBe(8);
  });
  it("removes a repeated chapter title without removing a different heading", () => {
    expect(chapterBody("# Biology\n\nText", "Biology")).toBe("Text");
    expect(chapterBody("## Cells\n\nText", "Biology")).toBe("## Cells\n\nText");
  });
  it("preserves notebook subjects and interactive quiz data in the export document", () => {
    const quiz = [{ id: "q", type: "true_false", question: "True?", answer: true }];
    const collection = { title: "Study", kind: "NOTEBOOK", ownerName: "Author", tocTitle: "Subjects", subjects: [{ id: "s", title: "Biology" }], items: [{ id: "c", resourceId: "qz", resourceType: "QUIZ", subjectId: "s" }], notes: [], reviewers: [], quizzes: [{ id: "qz", title: "Recall", questions: quiz }] } as unknown as PublicCollection;
    const book = collectionBookDocument(collection);
    expect(book.kind).toBe("NOTEBOOK");
    expect(book.chapters[0].subjectTitle).toBe("Biology");
    expect(book.chapters[0].quiz).toEqual(quiz);
    expect(book.chapters[0].content).toContain("Answer key");
  });
});
