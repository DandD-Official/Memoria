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

  it.each([
    ["note", ":::note\nA note with a runnable example.\n:::code{language=\"typescript\"}\nconst answer = 42;\n:::\n:::"],
    ["card", ":::card{title=\"Example\"}\n:::code{language=\"typescript\"}\nconst answer = 42;\n:::\n:::"],
    ["definition", ":::definition{term=\"Answer\"}\n:::code{language=\"typescript\"}\nconst answer = 42;\n:::\n:::"],
    ["section", ":::section{title=\"Example\"}\n:::code{language=\"typescript\"}\nconst answer = 42;\n:::\n:::"],
    ["details", ":::details{title=\"Show example\"}\n:::code{language=\"typescript\"}\nconst answer = 42;\n:::\n:::"],
  ])("supports a code block inside a %s block", (parent, source) => {
    const document = parseMmd(source);
    expect(document.children[0]).toMatchObject({ type: "block", block: parent });
    expect(document.children[0]).not.toMatchObject({ type: "mmd-error" });
    if (document.children[0]?.type === "block") {
      expect(document.children[0].children.some((child) => child.type === "block" && child.block === "code")).toBe(true);
    }
  });

  it("supports code inside a column without invalidating the columns layout", () => {
    const document = parseMmd([
      ":::columns",
      ":::column",
      ":::code{language=\"typescript\"}",
      "const left = true;",
      ":::",
      ":::",
      ":::column",
      ":::code{language=\"typescript\"}",
      "const right = true;",
      ":::",
      ":::",
      ":::",
    ].join("\n"));
    expect(document.children[0]).toMatchObject({ type: "block", block: "columns" });
    expect(document.children[0]).not.toMatchObject({ type: "mmd-error" });
  });
});
