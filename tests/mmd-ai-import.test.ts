import { describe, expect, it } from "vitest";
import { analyzeReviewerImport, stripCodeFences } from "@/lib/validation/reviewer";
import { parseMmd, collectMmdErrors } from "@/lib/mmd/parser";
import { isBlockNode } from "@/lib/mmd/ast";

/**
 * Milestone 10 ("Testing") explicitly calls for coverage of: a plain
 * Markdown AI response, a response wrapped in one outer code fence, a
 * document that itself contains internal code blocks, MMD content,
 * malformed AI output, and AI output containing image-requests. This
 * exercises the full stripCodeFences() -> parseMmd() pipeline exactly as
 * components/reviewers/reviewer-wizard.tsx and
 * components/guest/guest-reviewer-flow.tsx use it — see
 * .context/ai-content-generation.md for why stripCodeFences (not a new
 * lib/mmd/paste-import.ts) is the real paste-back entry point.
 */

function importAiResponse(raw: string) {
  const cleaned = stripCodeFences(raw);
  const doc = parseMmd(cleaned);
  return { cleaned, doc, errors: collectMmdErrors(doc) };
}

describe("AI import — plain Markdown response, no fence", () => {
  it("passes through unchanged and parses as plain markdown", () => {
    const raw = "# Cell Biology\n\nMitochondria are the powerhouse of the cell.";
    const { cleaned, doc, errors } = importAiResponse(raw);
    expect(cleaned).toBe(raw);
    expect(errors).toHaveLength(0);
    expect(doc.children).toEqual([{ type: "markdown", content: raw }]);
  });
});

describe("AI import — response wrapped in exactly one outer fence", () => {
  it("strips the outer fence and parses the document inside it", () => {
    const raw = "```markdown\n# Cell Biology\n\n:::key-concept\nATP is the energy currency of the cell.\n:::\n```";
    const { cleaned, errors } = importAiResponse(raw);
    expect(cleaned).not.toContain("```markdown");
    expect(cleaned).toContain("# Cell Biology");
    expect(errors).toHaveLength(0);
  });

  it("works with a bare ``` fence (no language tag)", () => {
    const raw = "```\n# Title\n\nBody text.\n```";
    const { cleaned } = importAiResponse(raw);
    expect(cleaned).toBe("# Title\n\nBody text.");
  });

  it("uses a four-backtick outer fence when the document contains a triple-backtick snippet", () => {
    const raw = [
      "````markdown",
      "# Title",
      "",
      "```js",
      "const arrow = '\\u2192';",
      "```",
      "",
      "Body.",
      "````",
    ].join("\n");
    const { cleaned } = importAiResponse(raw);
    expect(cleaned).toContain("```js");
    expect(cleaned).toContain("const arrow");
    expect(cleaned).not.toContain("````markdown");
  });
});

describe("AI import — document with internal code blocks (outer vs. inner fence)", () => {
  it("strips only the outer wrapper and preserves an inner js fence intact", () => {
    const raw = [
      "```markdown",
      "# Networking Notes",
      "",
      "Here is a routing example:",
      "",
      "```js",
      'console.log("packet forwarded");',
      "```",
      "",
      ":::note",
      "Remember this for the exam.",
      ":::",
      "```",
    ].join("\n");

    const { cleaned, doc, errors } = importAiResponse(raw);
    expect(cleaned.startsWith("```markdown")).toBe(false);
    expect(cleaned).toContain("```js");
    expect(cleaned).toContain('console.log("packet forwarded");');
    expect(errors).toHaveLength(0);
    // The inner js fence is part of a plain-Markdown text node, not
    // mistaken for an MMD block.
    const noteBlock = doc.children.find(isBlockNode);
    expect(noteBlock?.block).toBe("note");
  });
});

describe("AI import — MMD content", () => {
  it("parses callouts, definitions, and a diagram reference from a fenced AI response", () => {
    const raw = [
      "```markdown",
      "# Routing",
      "",
      ':::definition{term="Routing"}',
      "Selecting a path for packets across a network.",
      ":::",
      "",
      ':::diagram{id="routing-diagram" caption="How routing works"}',
      ":::",
      "",
      ':::warning{title="Exam Tip"}',
      "Know the difference between static and dynamic routing.",
      ":::",
      "```",
    ].join("\n");

    const { doc, errors } = importAiResponse(raw);
    expect(errors).toHaveLength(0);
    const blockNames = doc.children.filter(isBlockNode).map((b) => b.block);
    expect(blockNames).toEqual(["definition", "diagram", "warning"]);
  });
});

describe("AI import — malformed AI output", () => {
  it("strips the outer fence cleanly and reports the unterminated block as a diagnosable error, without losing content", () => {
    // A plausible real AI mistake: it closes its OWN outer ```markdown
    // wrapper correctly, but forgets to close a :::warning block inside
    // the document. stripCodeFences only cares about the outer wrapper
    // (valid start+end fence) and strips it fine; the missing ":::" is
    // then correctly caught by the parser, not silently absorbed.
    const raw = "```markdown\n# Title\n\n:::warning\nThis block is never closed.\n```";
    expect(() => importAiResponse(raw)).not.toThrow();
    const { cleaned, errors } = importAiResponse(raw);
    expect(cleaned).not.toContain("```");
    expect(errors).toHaveLength(1);
    expect(errors[0].reason).toBe("Missing closing marker for :::warning");
    // Content is preserved, not dropped, even though the block is broken.
    expect(errors[0].raw).toContain("This block is never closed.");
  });

  it("handles a response with an unknown block type without crashing", () => {
    const raw = "```markdown\n:::not-a-real-block\nsome content\n:::\n```";
    const { errors } = importAiResponse(raw);
    expect(errors).toHaveLength(1);
    expect(errors[0].reason).toBe("Unknown block type: not-a-real-block");
  });
});

describe("AI import — response containing image-requests", () => {
  it("parses image-request placeholders without treating them as real images", () => {
    const raw = [
      "```markdown",
      "# The OSI Model",
      "",
      ":::image-request{purpose=\"Illustrate the seven OSI layers\" alt=\"Diagram of the OSI model layers\" caption=\"Figure 1\"}",
      ":::",
      "```",
    ].join("\n");

    const { doc, errors } = importAiResponse(raw);
    expect(errors).toHaveLength(0);
    const block = doc.children.find(isBlockNode);
    expect(block?.block).toBe("image-request");
    expect(block?.attrs.purpose).toBe("Illustrate the seven OSI layers");
  });
});

describe("AI import — response with commentary outside the fence (ambiguous case)", () => {
  it("leaves the text untouched rather than guessing which part is the document", () => {
    const raw = 'Sure! Here\'s your document:\n```markdown\n# Title\ncontent\n```';
    const { cleaned } = importAiResponse(raw);
    // stripCodeFences requires the ENTIRE trimmed input to be exactly one
    // fence (start+end anchored) — commentary before the fence means it
    // doesn't match, so nothing is stripped and nothing is silently
    // discarded. The fence characters staying visible is the intended
    // "let the user review it" fallback, not a bug.
    expect(cleaned).toBe(raw);
    expect(analyzeReviewerImport(raw).warning).toMatch(/outside its Markdown fence/);
  });

  it("does not warn for a clean outer fence", () => {
    expect(analyzeReviewerImport("```markdown\n# Title\n\nBody.\n```").warning).toBeUndefined();
  });
});
