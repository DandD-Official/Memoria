import { describe, expect, it } from "vitest";
import { getSupportedBlockNames } from "@/lib/mmd/spec-blocks";
import { parseMmd } from "@/lib/mmd/parser";
import { isBlockNode, type MmdBlockNode } from "@/lib/mmd/ast";
import {
  getBlockLabel,
  getDiagramPlaceholderText,
  getImagePlaceholderText,
  getImageRequestPlaceholderText,
  getSvgPlaceholderText,
  getUnsupportedBlockText,
  isCalloutBlock,
} from "@/lib/mmd/export-helpers";

/** Block names handled by an explicit case in both exporters' renderMmdNode
 * switch (lib/pdf-export.ts / lib/word-export.ts), rather than falling
 * through to the generic getBlockLabel()-driven default case. Kept here,
 * duplicated as a literal list, specifically so this test fails loudly if
 * a new block is added to spec-blocks.ts without anyone deciding how it
 * should export — see the "every block is either labeled or explicitly
 * handled" test below. */
const EXPLICITLY_HANDLED_IN_EXPORTERS = new Set(["section", "columns", "column", "diagram", "image", "gallery", "image-request", "svg"]);

function firstBlock(source: string): MmdBlockNode {
  const doc = parseMmd(source);
  const block = doc.children.find(isBlockNode);
  if (!block) throw new Error(`no block parsed from: ${source}`);
  return block;
}

describe("export-helpers — every block is either labeled or explicitly handled", () => {
  it("getBlockLabel returns non-empty text OR the block is explicitly cased in both exporters", () => {
    for (const name of getSupportedBlockNames()) {
      if (EXPLICITLY_HANDLED_IN_EXPORTERS.has(name)) continue;
      // Build a minimal valid instance of this block to check its label.
      const node = firstBlock(minimalValidInstance(name));
      const label = getBlockLabel(node);
      expect(label, `:::${name} has no export label and isn't explicitly handled — it would render silently`).not.toBe(
        ""
      );
    }
  });
});

function minimalValidInstance(name: string): string {
  switch (name) {
    case "definition":
      return ':::definition{term="X"}\nbody\n:::';
    case "example":
      return ":::example\nbody\n:::";
    case "card":
      return ':::card{title="X"}\nbody\n:::';
    case "details":
      return ':::details{title="X"}\nbody\n:::';
    case "math":
      return ':::math{formula="\\\\rightarrow"}\n:::';
    default:
      return `:::${name}\nbody\n:::`;
  }
}

describe("getBlockLabel", () => {
  it("uses a custom title when provided on a callout", () => {
    const node = firstBlock(':::warning{title="Exam Reminder"}\nbody\n:::');
    expect(getBlockLabel(node)).toBe("Exam Reminder");
  });

  it("falls back to the default label when no title is given", () => {
    const node = firstBlock(":::warning\nbody\n:::");
    expect(getBlockLabel(node)).toBe("Warning");
  });

  it("includes the term for definitions", () => {
    const node = firstBlock(':::definition{term="Normalization"}\nbody\n:::');
    expect(getBlockLabel(node)).toContain("Normalization");
  });

  it("marks details as expandable in-app (export renders it expanded)", () => {
    const node = firstBlock(':::details{title="More info"}\nbody\n:::');
    expect(getBlockLabel(node)).toContain("More info");
    expect(getBlockLabel(node).toLowerCase()).toContain("expandable in-app");
  });

  it("returns an empty label for an untitled card (no label line needed)", () => {
    const node = firstBlock(":::card\nbody\n:::");
    expect(getBlockLabel(node)).toBe("");
  });
});

describe("isCalloutBlock", () => {
  it("recognizes exactly the six callout names", () => {
    for (const name of ["note", "tip", "warning", "danger", "info", "success"]) {
      expect(isCalloutBlock(name)).toBe(true);
    }
    for (const name of ["definition", "card", "section", "columns"]) {
      expect(isCalloutBlock(name)).toBe(false);
    }
  });
});

describe("placeholder text never implies a real image/diagram exists", () => {
  it("diagram placeholder names the missing id, not a fake render", () => {
    const node = firstBlock(':::diagram{id="net-1" caption="Topology"}\n:::');
    const text = getDiagramPlaceholderText(node);
    expect(text).toContain("net-1");
    expect(text.toLowerCase()).toContain("not available");
  });

  it("image placeholder surfaces alt text instead of a broken image", () => {
    const node = firstBlock(':::image{src="https://x" alt="A router diagram"}\n:::');
    const text = getImagePlaceholderText(node);
    expect(text).toContain("A router diagram");
    expect(text.toLowerCase()).toContain("not included");
  });

  it("image-request placeholder never claims the image is ready", () => {
    const node = firstBlock(':::image-request{purpose="Explain OSI layers" alt="OSI diagram"}\n:::');
    const text = getImageRequestPlaceholderText(node);
    expect(text.toLowerCase()).toContain("pending");
    expect(text).not.toMatch(/^\[Image\]$/); // not styled as if it's a resolved image
  });

  it("SVG placeholder identifies the visual and its alt text", () => {
    const node = firstBlock(':::svg{alt="OSI layers" caption="Figure 1"}\n<svg></svg>\n:::');
    expect(getSvgPlaceholderText(node)).toContain("OSI layers");
    expect(getSvgPlaceholderText(node).toLowerCase()).toContain("svg visual");
  });
});

describe("getUnsupportedBlockText", () => {
  it("names the reason so the exported text explains itself, not just shows raw syntax", () => {
    expect(getUnsupportedBlockText("Unknown block type: foo")).toContain("Unknown block type: foo");
  });
});
