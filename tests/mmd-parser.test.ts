import { describe, expect, it } from "vitest";
import { parseMmd, collectMmdErrors, isPlainMarkdown } from "@/lib/mmd/parser";
import type { MmdBlockNode, MmdErrorNode } from "@/lib/mmd/ast";

function blocks(doc: ReturnType<typeof parseMmd>) {
  return doc.children.filter((n): n is MmdBlockNode => n.type === "block");
}

describe("parseMmd — backward compatibility", () => {
  it("parses plain Markdown with zero fences as a single markdown node", () => {
    const source = "# Title\n\nSome **bold** text.\n\n- a\n- b\n";
    const doc = parseMmd(source);
    expect(doc.mmdVersion).toBe(1);
    expect(doc.children).toHaveLength(1);
    expect(doc.children[0]).toEqual({ type: "markdown", content: source.replace(/\n$/, "") });
    expect(collectMmdErrors(doc)).toHaveLength(0);
  });

  it("isPlainMarkdown correctly flags documents with no MMD fences", () => {
    expect(isPlainMarkdown("# Hello\n\nJust markdown.")).toBe(true);
    expect(isPlainMarkdown(":::note\nhi\n:::")).toBe(false);
  });

  it("treats a bare ':::' with no valid block name as literal text, not a fence", () => {
    const source = "Before\n\n:::\n\nAfter";
    const doc = parseMmd(source);
    expect(blocks(doc)).toHaveLength(0);
    expect(collectMmdErrors(doc)).toHaveLength(0);
    expect(doc.children[0]).toMatchObject({ type: "markdown", content: source });
  });

  it("treats an invalid block name (uppercase) as literal text", () => {
    const source = ":::Note\ncontent\n:::";
    const doc = parseMmd(source);
    expect(blocks(doc)).toHaveLength(0);
  });
});

describe("parseMmd — simple blocks", () => {
  it("parses a callout with a title attribute", () => {
    const doc = parseMmd(':::warning{title="Exam Reminder"}\nReview this before the exam.\n:::');
    const [block] = blocks(doc);
    expect(block.block).toBe("warning");
    expect(block.attrs).toEqual({ title: "Exam Reminder" });
    expect(block.children).toEqual([{ type: "markdown", content: "Review this before the exam." }]);
  });

  it("parses a callout with no attributes", () => {
    const doc = parseMmd(":::note\nJust a note.\n:::");
    const [block] = blocks(doc);
    expect(block.block).toBe("note");
    expect(block.attrs).toEqual({});
  });

  it("requires the term attribute on definition", () => {
    const doc = parseMmd(':::definition{term="Normalization"}\nReduces redundancy.\n:::');
    const [block] = blocks(doc);
    expect(block.block).toBe("definition");
    expect(block.attrs.term).toBe("Normalization");
  });

  it("errors when a required attribute is missing", () => {
    const doc = parseMmd(":::definition\nNo term given.\n:::");
    const errors = collectMmdErrors(doc);
    expect(errors).toHaveLength(1);
    expect(errors[0].reason).toMatch(/Missing required attribute.*term/);
    expect(errors[0].raw).toContain("No term given.");
  });

  it("parses multiple quoted attributes in one fence", () => {
    const doc = parseMmd(':::card{title="OSI Model" subtitle="Layers" type="highlight"}\nBody\n:::');
    const [block] = blocks(doc);
    expect(block.attrs).toEqual({ title: "OSI Model", subtitle: "Layers", type: "highlight" });
  });

  it("drops unknown attributes without failing the block", () => {
    const doc = parseMmd(':::note{color="red"}\nhi\n:::');
    const [block] = blocks(doc);
    expect(block.attrs).toEqual({});
    expect(collectMmdErrors(doc)).toHaveLength(0);
  });

  it("rejects an invalid enum attribute value on an optional field but keeps the block", () => {
    const doc = parseMmd(':::card{type="rainbow"}\nhi\n:::');
    const [block] = blocks(doc);
    expect(block.attrs.type).toBeUndefined();
    expect(collectMmdErrors(doc)).toHaveLength(0);
  });
});

describe("parseMmd — unknown and malformed blocks", () => {
  it("flags an unknown block type without crashing or dropping content", () => {
    const doc = parseMmd(":::something\nmystery content\n:::");
    const errors = collectMmdErrors(doc);
    expect(errors).toHaveLength(1);
    expect(errors[0].reason).toBe("Unknown block type: something");
    expect(errors[0].raw).toContain("mystery content");
  });

  it("flags an unterminated block spanning to end of document", () => {
    const doc = parseMmd(":::warning\nThis never closes.\nMore text.");
    const errors = collectMmdErrors(doc);
    expect(errors).toHaveLength(1);
    expect(errors[0].reason).toBe("Missing closing marker for :::warning");
    expect(errors[0].raw).toContain("This never closes.");
    expect(errors[0].raw).toContain("More text.");
  });

  it("does not let an unterminated block swallow a later, correctly-closed sibling", () => {
    // A opens and is never closed; B opens after and IS properly closed.
    // Since a bare ':::' is LIFO, B's own close correctly closes B (as the
    // innermost open block at that point), leaving A unterminated.
    const source = [
      ":::warning",
      "A never closes",
      ":::tip",
      "B is fine",
      ":::",
      "trailing text still inside A",
    ].join("\n");
    const doc = parseMmd(source);
    const errors = collectMmdErrors(doc);
    // A is unterminated (top-level error).
    expect(errors.some((e) => e.reason === "Missing closing marker for :::warning")).toBe(true);
    // B, nested inside A's body, was still correctly parsed as a closed
    // block — not lost, not itself flagged as an error.
    const warningError = errors.find((e) => e.reason === "Missing closing marker for :::warning")!;
    expect(warningError.raw).toContain(":::tip");
    expect(warningError.raw).toContain("B is fine");
  });
});

describe("parseMmd — nesting rules", () => {
  it("allows a definition to nest one level inside a note", () => {
    const doc = parseMmd(':::note\nIntro text.\n\n:::definition{term="X"}\nX means Y.\n:::\n:::');
    const [note] = blocks(doc);
    expect(note.block).toBe("note");
    const nestedBlocks = note.children.filter((c): c is MmdBlockNode => c.type === "block");
    expect(nestedBlocks).toHaveLength(1);
    expect(nestedBlocks[0].block).toBe("definition");
    expect(nestedBlocks[0].attrs.term).toBe("X");
  });

  it("rejects a section nested inside a note (not on the allow-list)", () => {
    const doc = parseMmd(':::note\n:::section{title="Nope"}\nbody\n:::\n:::');
    const [note] = blocks(doc);
    const nestedErrors = note.children.filter((c): c is MmdErrorNode => c.type === "mmd-error");
    expect(nestedErrors).toHaveLength(1);
    expect(nestedErrors[0].reason).toMatch(/cannot contain a nested :::section/);
  });

  it("allows arbitrary block types inside a section up to the depth limit", () => {
    const doc = parseMmd(
      [
        ':::section{title="Network Layer"}',
        ':::definition{term="Routing"}',
        "Path selection.",
        ":::",
        ':::diagram{id="net-1"}',
        ":::",
        ":::",
      ].join("\n")
    );
    const [section] = blocks(doc);
    expect(section.block).toBe("section");
    expect(section.attrs.title).toBe("Network Layer");
    const nested = section.children.filter((c): c is MmdBlockNode => c.type === "block");
    expect(nested.map((n) => n.block).sort()).toEqual(["definition", "diagram"]);
  });

  it("enforces the maximum nesting depth inside containers", () => {
    // section > section > section > section > section is 5 levels deep;
    // maxDepth is 4, so the 5th should error rather than recurse forever.
    const deepest = ':::section{title="L5"}\ntoo deep\n:::';
    const source = [4, 3, 2, 1].reduce(
      (inner, level) => `:::section{title="L${level}"}\n${inner}\n:::`,
      deepest
    );
    const doc = parseMmd(source);
    const errors = collectMmdErrors(doc);
    expect(errors.some((e) => e.reason.includes("Maximum nesting depth exceeded"))).toBe(true);
  });

  it("rejects a columns block whose only child is not a column", () => {
    const doc = parseMmd(':::columns\n:::note\nnope\n:::\n:::');
    const errors = collectMmdErrors(doc);
    expect(errors).toHaveLength(1);
    expect(errors[0].reason).toMatch(/may only contain: column/);
  });

  it("accepts a columns block containing only column children", () => {
    const doc = parseMmd(
      [":::columns", ":::column", "Left content.", ":::", ":::column", "Right content.", ":::", ":::"].join("\n")
    );
    const [columns] = blocks(doc);
    expect(columns.block).toBe("columns");
    const cols = columns.children.filter((c): c is MmdBlockNode => c.type === "block");
    expect(cols).toHaveLength(2);
    expect(cols.every((c) => c.block === "column")).toBe(true);
  });

  it("rejects a column nested directly inside another column's disallowed 'columns'", () => {
    const doc = parseMmd(
      [
        ":::columns",
        ":::column",
        ":::columns",
        ":::column",
        "nested",
        ":::",
        ":::",
        ":::",
        ":::",
      ].join("\n")
    );
    const errors = collectMmdErrors(doc);
    expect(errors.some((e) => e.reason.includes("cannot contain a nested :::columns"))).toBe(true);
  });
});

describe("parseMmd — media and diagram blocks", () => {
  it("requires src and alt on image blocks", () => {
    const doc = parseMmd(':::image{alt="Missing src"}\n:::');
    const errors = collectMmdErrors(doc);
    expect(errors[0].reason).toMatch(/src/);
  });

  it("parses a valid image block with all attributes", () => {
    const doc = parseMmd(
      ':::image{src="media://abc123" alt="Network diagram" caption="Figure 1" align="center" size="large"}\n:::'
    );
    const [block] = blocks(doc);
    expect(block.attrs).toEqual({
      src: "media://abc123",
      alt: "Network diagram",
      caption: "Figure 1",
      align: "center",
      size: "large",
    });
  });

  it("rejects an image src containing a javascript: scheme", () => {
    const doc = parseMmd(':::image{src="javascript:alert(1)" alt="bad"}\n:::');
    const errors = collectMmdErrors(doc);
    expect(errors[0].reason).toMatch(/src/);
  });

  it("only allows image blocks (or bare markdown images) inside a gallery", () => {
    const doc = parseMmd(
      [
        ":::gallery",
        ':::image{src="media://1" alt="Router"}',
        ":::",
        ':::image{src="media://2" alt="Switch"}',
        ":::",
        ":::",
      ].join("\n")
    );
    const [gallery] = blocks(doc);
    const images = gallery.children.filter((c): c is MmdBlockNode => c.type === "block");
    expect(images).toHaveLength(2);
    expect(images.every((i) => i.block === "image")).toBe(true);
  });

  it("rejects a non-image block nested inside a gallery", () => {
    const doc = parseMmd(':::gallery\n:::note\nnot an image\n:::\n:::');
    const [gallery] = blocks(doc);
    const errors = gallery.children.filter((c): c is MmdErrorNode => c.type === "mmd-error");
    expect(errors).toHaveLength(1);
    expect(errors[0].reason).toMatch(/cannot contain a nested :::note/);
  });

  it("parses a diagram reference block by id", () => {
    const doc = parseMmd(':::diagram{id="network-topology" caption="Basic Network Topology"}\n:::');
    const [block] = blocks(doc);
    expect(block.block).toBe("diagram");
    expect(block.attrs).toEqual({ id: "network-topology", caption: "Basic Network Topology" });
    expect(block.children).toEqual([]);
  });
});

describe("parseMmd — AI image-request placeholder", () => {
  it("parses a valid image-request and never treats it as a real image", () => {
    const doc = parseMmd(
      ':::image-request{purpose="Explain OSI layers" alt="OSI diagram" caption="Figure 1" placement="after intro"}\n:::'
    );
    const [block] = blocks(doc);
    expect(block.block).toBe("image-request");
    expect(block.attrs.purpose).toBe("Explain OSI layers");
    expect(block.attrs.alt).toBe("OSI diagram");
  });

  it("requires purpose and alt on image-request", () => {
    const doc = parseMmd(':::image-request{caption="no purpose or alt"}\n:::');
    const errors = collectMmdErrors(doc);
    expect(errors[0].reason).toMatch(/purpose, alt|alt, purpose/);
  });
});

describe("parseMmd — details block", () => {
  it("parses collapsible content with a title", () => {
    const doc = parseMmd(':::details{title="Click to reveal"}\nHidden content.\n:::');
    const [block] = blocks(doc);
    expect(block.block).toBe("details");
    expect(block.attrs.title).toBe("Click to reveal");
    expect(block.children).toEqual([{ type: "markdown", content: "Hidden content." }]);
  });
});

describe("parseMmd — mixed document", () => {
  it("parses a realistic mixed document end-to-end with no errors", () => {
    const source = [
      "# Network Layer",
      "",
      ":::summary",
      "The Network Layer enables packet delivery between different networks.",
      ":::",
      "",
      ':::definition{term="Routing"}',
      "The process of selecting a path for packets to travel across a network.",
      ":::",
      "",
      ':::diagram{id="network-topology" caption="Basic Network Topology"}',
      ":::",
      "",
      ':::warning{title="Important"}',
      "Routers use routing information to determine where packets should be forwarded.",
      ":::",
      "",
      ':::example{title="Example"}',
      "A packet traveling from one network to another may pass through multiple routers.",
      ":::",
      "",
      ':::details{title="Additional Explanation"}',
      "Additional technical information can be placed here without cluttering the main document.",
      ":::",
    ].join("\n");

    const doc = parseMmd(source);
    expect(collectMmdErrors(doc)).toHaveLength(0);
    const names = blocks(doc).map((b) => b.block);
    expect(names).toEqual(["summary", "definition", "diagram", "warning", "example", "details"]);
  });
});
