import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { collectionBookDocument, quizChapterMarkdown } from "@/lib/books/document";
import { BookSurface } from "@/components/books/book-surface";
import type { PublicCollection } from "@/lib/share-collections-repo";
import { emptyDiagramData } from "@/lib/diagrams/schema";
vi.mock("@/lib/diagrams/repo", () => ({ findDiagramById: vi.fn() }));
vi.mock("@/lib/media/repo", () => ({ findMedia: vi.fn() }));
import { findDiagramById } from "@/lib/diagrams/repo";
import { findMedia } from "@/lib/media/repo";
import { resolveBookDocument } from "@/lib/books/resolve";

const collection: PublicCollection = { id: "book", slug: "book", title: "A learning journey", subtitle: "Connected ideas", description: "A guide", tocTitle: "Contents", ownerName: "Author", items: [{ id: "b", resourceType: "REVIEWER", resourceId: "r" }, { id: "a", resourceType: "NOTE", resourceId: "n" }], notes: [{ id: "n", title: "Note", description: null, content: "Original **note**." }], reviewers: [{ id: "r", title: "Review", description: null, content: "Original review." }], quizzes: [], feedback: [], viewerUserId: null, viewerPermission: "VIEW", lastReadItemId: null, isPrivateAccess: false, canExport: true };

describe("shared book document", () => {
  beforeEach(() => vi.resetAllMocks());
  it("keeps reading order, metadata, and source content", () => {
    const book = collectionBookDocument(collection);
    expect(book.chapters.map(chapter => chapter.id)).toEqual(["b", "a"]);
    expect(book.chapters[1].content).toBe("Original **note**.");
    const markup = renderToStaticMarkup(createElement(BookSurface, { book }));
    expect(markup.indexOf('data-book-cover')).toBeLessThan(markup.indexOf('data-book-contents'));
    expect(markup.indexOf('data-book-contents')).toBeLessThan(markup.indexOf('data-book-chapter'));
    expect(markup).toContain("memoria."); expect(markup).toContain("Connected ideas");
  });
  it("includes quiz options, answer spaces, and an answer key", () => {
    const content = quizChapterMarkdown([{ id: "q", type: "multiple_choice", question: "Choose one", choices: ["Alpha", "Beta"], answer: 1, explanation: "Because beta." }, { id: "q2", type: "true_false", question: "True?", answer: true }]);
    expect(content).toContain("A. Alpha"); expect(content).toContain("B. Beta");
    expect(content).toContain("False"); expect(content).toContain("## Answer key"); expect(content).toContain("Because beta.");
  });
  it("shares only embedded assets owned by the book owner", async () => {
    const source = { ...collection, notes: [{ ...collection.notes[0], content: ':::diagram{id="mine"}\n:::\n\n:::diagram{id="foreign"}\n:::\n\n:::image{src="media://photo" alt="A photo"}\n:::' }] };
    vi.mocked(findDiagramById).mockImplementation(async id => ({ id, ownerId: id === "mine" ? "owner" : "someone-else", title: "Diagram", data: emptyDiagramData(), schemaVersion: 1, previewMimeType: null, createdAt: new Date(), updatedAt: new Date() }));
    vi.mocked(findMedia).mockResolvedValue({ data: Buffer.from("image"), mimeType: "image/png" });
    const book = await resolveBookDocument(source, "owner");
    expect(book.assets?.["diagram://mine"]).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(book.assets?.["diagram://foreign"]).toBeNull();
    expect(findMedia).toHaveBeenCalledWith("photo", "owner");
    expect(findDiagramById).toHaveBeenCalledTimes(2);
  });
  it("does not fetch anything when chapters contain no embedded references", async () => {
    await resolveBookDocument(collection, "owner");
    expect(findDiagramById).not.toHaveBeenCalled(); expect(findMedia).not.toHaveBeenCalled();
  });
});
