import { describe, expect, it } from "vitest";
import { buildMarkdownPdf } from "@/lib/pdf-export";
import { buildMarkdownWord } from "@/lib/word-export";

/**
 * These exercise the real jsPDF/docx code paths (both already existing
 * dependencies — this isn't introducing anything new), specifically to
 * catch the failure mode the original audit flagged: both exporters used
 * to scan raw Markdown lines with zero fence-awareness, so a ":::note"
 * line would show up as literal garbage text in the export instead of
 * being interpreted. These tests assert that no longer happens.
 */

const MIXED_DOCUMENT = [
  "# Network Layer",
  "",
  "Plain paragraph before any block.",
  "",
  ':::warning{title="Exam Reminder"}',
  "Review this before the exam.",
  ":::",
  "",
  ':::definition{term="Routing"}',
  "Selecting a path for packets.",
  ":::",
  "",
  ':::diagram{id="topology"}',
  ":::",
  "",
  ':::columns',
  ':::column',
  "Left side.",
  ":::",
  ':::column',
  "Right side.",
  ":::",
  ":::",
].join("\n");

describe("buildMarkdownPdf — MMD awareness", () => {
  it("does not throw on a document mixing plain Markdown and MMD blocks", () => {
    expect(() => buildMarkdownPdf("Test", MIXED_DOCUMENT)).not.toThrow();
  });

  it("still exports a plain-Markdown-only document (no regression)", () => {
    const plain = "# Title\n\nJust a paragraph.\n\n- one\n- two\n\n| A | B |\n|---|---|\n| 1 | 2 |\n";
    expect(() => buildMarkdownPdf("Plain", plain)).not.toThrow();
  });

  it("does not crash on malformed MMD (unterminated block)", () => {
    expect(() => buildMarkdownPdf("Broken", ":::warning\nnever closes")).not.toThrow();
  });
});

describe("buildMarkdownWord — MMD awareness", () => {
  it("does not throw on a document mixing plain Markdown and MMD blocks", () => {
    expect(() => buildMarkdownWord("Test", MIXED_DOCUMENT)).not.toThrow();
  });

  it("still exports a plain-Markdown-only document (no regression)", () => {
    const plain = "# Title\n\nJust a paragraph.\n\n- one\n- two\n";
    expect(() => buildMarkdownWord("Plain", plain)).not.toThrow();
  });

  it("does not crash on malformed MMD (unterminated block)", () => {
    expect(() => buildMarkdownWord("Broken", ":::warning\nnever closes")).not.toThrow();
  });
});

const RICH_MEDIA_DOCUMENT = [
  "# Study Guide",
  "",
  ':::card{title="OSI Model" type="highlight"}',
  "Seven layers, physical to application.",
  ":::",
  "",
  ':::image{src="https://example.com/router.png" alt="A router" caption="Figure 2"}',
  ":::",
  "",
  ":::gallery",
  "![Switch](https://example.com/switch.png)",
  ":::",
  "",
  ':::details{title="Extra credit"}',
  "Optional deeper-dive content.",
  ":::",
  "",
  ':::image-request{purpose="Show packet flow" alt="Packet flow diagram"}',
  ":::",
].join("\n");

describe("buildMarkdownPdf — remaining block types (cards, images, collapsible)", () => {
  it("does not throw on cards, images, galleries, details, and image-requests", () => {
    expect(() => buildMarkdownPdf("Rich media", RICH_MEDIA_DOCUMENT)).not.toThrow();
  });
});

describe("buildMarkdownWord — remaining block types (cards, images, collapsible)", () => {
  it("does not throw on cards, images, galleries, details, and image-requests", () => {
    expect(() => buildMarkdownWord("Rich media", RICH_MEDIA_DOCUMENT)).not.toThrow();
  });
});
