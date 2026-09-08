import { describe, expect, it } from "vitest";
import { buildMarkdownPdf } from "@/lib/pdf-export";
import { buildBookWord } from "@/lib/word-export";

const content = "# Contents\n\n1. Opening\n\n# Opening\n\nA first chapter.";

describe("Book export templates", () => {
  it("adds a dedicated cover page to Book PDFs", () => {
    const pdf = buildMarkdownPdf("A Book", content, { bookCover: { subtitle: "A subtitle", description: "A description", author: "Reader" } });
    expect(pdf.getNumberOfPages()).toBeGreaterThanOrEqual(2);
  });

  it("builds a Book-specific Word document", () => {
    expect(() => buildBookWord("A Book", content, { subtitle: "A subtitle", author: "Reader" })).not.toThrow();
  });
});
