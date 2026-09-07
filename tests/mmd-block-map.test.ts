import { describe, expect, it } from "vitest";
import { mapMmdBlocks } from "@/lib/mmd/block-map";

describe("MMD editor block map", () => {
  it("maps nested blocks to their LIFO closing lines", () => {
    const source = [':::section{title="A"}', ":::note", "Body", ":::", ":::"].join("\n");
    expect(mapMmdBlocks(source)).toEqual([
      { name: "section", openLine: 1, closeLine: 5, depth: 0 },
      { name: "note", openLine: 2, closeLine: 4, depth: 1 },
    ]);
  });

  it("marks an unclosed block", () => {
    expect(mapMmdBlocks("Text\n:::warning\nBody")).toEqual([
      { name: "warning", openLine: 2, closeLine: null, depth: 0 },
    ]);
  });
});
