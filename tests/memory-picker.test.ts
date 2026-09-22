import { describe, expect, it } from "vitest";
import { findPickerMemories, memoryKey, type PickerMemory } from "@/lib/books/memory-picker";

const memories: PickerMemory[] = [
  { id: "same", resourceType: "NOTE", title: "Cell structure", description: "Mitochondria and energy", tags: ["Biology"], updatedAt: "2026-01-01", isFavorite: true },
  { id: "same", resourceType: "REVIEWER", title: "Exam preparation", description: "Cell division", tags: ["Biology", "Finals"], updatedAt: "2026-03-01" },
  { id: "quiz", resourceType: "QUIZ", title: "Algebra practice", tags: ["Math"], updatedAt: "2026-02-01" },
  { id: "archive", resourceType: "NOTE", title: "Old cell notes", archived: true, updatedAt: "2026-04-01" },
];
const defaults = { query: "", type: "ALL" as const, favorites: false, tag: "", sort: "recent" as const, archived: false };
describe("memory discovery", () => {
  it("finds multiple words across titles, descriptions, and tags regardless of case", () => {
    expect(findPickerMemories(memories, { ...defaults, query: "  BIOLOGY energy  " }).map(memoryKey)).toEqual(["NOTE:same"]);
    expect(findPickerMemories(memories, { ...defaults, query: "cell" }).map(memoryKey)).toEqual(["REVIEWER:same", "NOTE:same"]);
  });
  it("combines type, favorite, and tag filters", () => {
    expect(findPickerMemories(memories, { ...defaults, type: "NOTE", favorites: true, tag: "Biology" })).toEqual([memories[0]]);
    expect(findPickerMemories(memories, { ...defaults, type: "QUIZ", tag: "Biology" })).toEqual([]);
  });
  it("hides archived material by default but lets users find it explicitly", () => {
    expect(findPickerMemories(memories, defaults)).toHaveLength(3);
    expect(findPickerMemories(memories, { ...defaults, archived: true })[0].id).toBe("archive");
  });
  it("sorts across types by recency or title without changing the library", () => {
    expect(findPickerMemories(memories, defaults).map(memoryKey)).toEqual(["REVIEWER:same", "QUIZ:quiz", "NOTE:same"]);
    expect(findPickerMemories(memories, { ...defaults, sort: "title" }).map(memoryKey)).toEqual(["QUIZ:quiz", "NOTE:same", "REVIEWER:same"]);
    expect(memories[0].title).toBe("Cell structure");
  });
  it("keeps identically identified resources distinct across types", () => {
    expect(new Set(memories.map(memoryKey)).size).toBe(4);
  });
});
