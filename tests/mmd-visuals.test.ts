import { describe, expect, it } from "vitest";
import { buildMediaImageBlock } from "@/lib/mmd/visuals";
import { collectMmdErrors, parseMmd } from "@/lib/mmd/parser";

describe("visual request fulfillment", () => {
  it("builds a valid persistent media image block", () => {
    const block = buildMediaImageBlock({ mediaId: "media-1", alt: "OSI layers", caption: "Figure 1" });
    expect(block).toContain('src="media://media-1"');
    expect(collectMmdErrors(parseMmd(block))).toHaveLength(0);
  });

  it("escapes quotes in user-facing attributes", () => {
    const block = buildMediaImageBlock({ mediaId: "media-2", alt: 'A "safe" diagram' });
    expect(block).toContain('alt="A \\"safe\\" diagram"');
    expect(collectMmdErrors(parseMmd(block))).toHaveLength(0);
  });
});
