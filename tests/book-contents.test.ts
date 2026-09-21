import { describe, expect, it } from "vitest";
import { bookContents } from "@/lib/books/contents";
import type { BookDocument } from "@/lib/books/document";

const book: BookDocument = { title: "Notebook", kind: "NOTEBOOK", author: "Reader", tocTitle: "Contents", chapters: [
  { id: "a", kind: "NOTE", title: "First", content: "", subjectId: "one", subjectTitle: "Title" },
  { id: "b", kind: "NOTE", title: "Second", content: "", subjectId: "one", subjectTitle: "Title" },
  { id: "c", kind: "NOTE", title: "Third", content: "", subjectId: "two", subjectTitle: "Title" },
  { id: "d", kind: "NOTE", title: "Unfiled", content: "" },
] };
describe("notebook contents", () => {
  it("separates titled groups and restarts their entry numbers", () => {
    const entries = bookContents(book);
    expect(entries.map(entry => entry.number)).toEqual(["1.1", "1.2", "2.1", "3.1"]);
    expect(entries.map(entry => entry.groupStart)).toEqual([true, false, true, true]);
    expect(entries[2].groupKey).toBe("two");
    expect(entries[3].groupTitle).toBe("Unfiled");
  });
  it("keeps regular books sequential without section headers", () => {
    const entries = bookContents({ ...book, kind: "BOOK" });
    expect(entries.map(entry => entry.number)).toEqual(["01", "02", "03", "04"]);
    expect(entries.every(entry => !entry.groupStart)).toBe(true);
  });
});
