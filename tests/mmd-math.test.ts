import { describe, expect, it } from "vitest";
import { remarkMmdMath, renderMathFormula } from "@/lib/mmd/math";
import { collectMmdErrors, parseMmd } from "@/lib/mmd/parser";

describe("MMD math element", () => {
  it("renders the returned $\\rightarrow$ notation as a safe inline element", () => {
    const tree = { type: "root", children: [{ type: "paragraph", children: [{ type: "text", value: "Input $\\rightarrow$ output" }] }] };
    remarkMmdMath()(tree);
    const children = tree.children[0].children;
    expect(children).toHaveLength(3);
    expect(children[1]).toMatchObject({ value: "→", data: { hName: "span" } });
  });

  it("supports an explicit math MMD block", () => {
    const doc = parseMmd(':::math{formula="\\\\rightarrow"}\n:::');
    expect(collectMmdErrors(doc)).toHaveLength(0);
    expect(renderMathFormula("\\rightarrow")).toBe("→");
  });
});
