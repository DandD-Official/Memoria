import { describe, expect, it } from "vitest";
import { parseMmd } from "@/lib/mmd/parser";
import { tokeniseCodeLine } from "@/lib/mmd/code-highlight";
import { CODE_THEME_IDS } from "@/lib/mmd/code-themes";

describe("editable MMD code blocks", () => {
  it("preserves the custom code block body and attributes", () => {
    const document = parseMmd(':::code{language="typescript" theme="dracula"}\n\tconst answer = 42;\n:::');
    const node = document.children[0];
    expect(node).toMatchObject({ type: "block", block: "code", attrs: { language: "typescript", theme: "dracula" } });
    expect(node.type).toBe("block");
    if (node.type === "block") {
      expect(node.children[0]).toMatchObject({ type: "markdown", content: "\tconst answer = 42;" });
    }
  });

  it("returns syntax tokens without removing indentation", () => {
    const tokens = tokeniseCodeLine("\tconst answer = 42; // result", "typescript");
    expect(tokens.map((token) => token.kind)).toEqual([
      "plain",
      "keyword",
      "plain",
      "plain",
      "plain",
      "operator",
      "plain",
      "number",
      "plain",
      "comment",
    ]);
    expect(tokens[0]?.value).toBe("\t");
  });

  it("exposes the supported settings themes", () => {
    expect(CODE_THEME_IDS).toEqual(["memoria-dark", "github-light", "dracula", "solarized-light"]);
  });
});
