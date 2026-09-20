import { describe, expect, it } from "vitest";
import { parseMmd, collectMmdErrors, isPlainMarkdown } from "@/lib/mmd/parser";
import { scanMmd, indentReplacement } from "@/lib/mmd/grammar";
import { analyzeMmd } from "@/lib/mmd/diagnostics";
import { INSERT_TEMPLATES } from "@/lib/mmd/editor-templates";
import { indentLines, enterEdit, smartBackspace, electricCloser, blockCandidates, enumValues } from "@/lib/mmd/editor-commands";

describe("MMD source grammar", () => {
  it("dedents nested fences relative to their own indent", () => {
    const doc = parseMmd(':::card\n  :::note\n    Text\n  :::\n:::');
    const card = doc.children[0]; expect(card.type).toBe("block");
    if (card.type !== "block") return;
    const note = card.children[0]; expect(note.type).toBe("block");
    if (note.type !== "block") return;
    expect(note.children).toEqual([{ type: "markdown", content: "Text" }]);
    expect(note.position).toMatchObject({ openLine: 2, closeLine: 4, indent: "  " });
    expect(note.raw).toBe("  :::note\n    Text\n  :::");
  });
  it("keeps CRLF slices and offsets exact", () => {
    const source = 'intro\r\n\t:::note{title="hello"}\r\n\t  text\r\n\t:::\r\n';
    const node = parseMmd(source).children[1];
    expect(node.position?.openLine).toBe(2);
    if (node.type !== "block") throw Error("Expected block");
    expect(source.slice(node.position!.startOffset, node.position!.endOffset)).toBe(node.raw);
    const attr = node.position!.attributes[0]; expect(source.slice(attr.valueFrom, attr.valueTo)).toBe("hello");
    expect(indentReplacement(node.raw, ":::note\nnew\n:::\n")).toBe("\t:::note\r\n\tnew\r\n\t:::\r\n");
  });
  it.each(["```", "~~~~"])("ignores colon fences inside %s code", marker => {
    const source = `${marker}\n:::note\n:::Nope\n:::\n${marker}`;
    expect(isPlainMarkdown(source)).toBe(true); expect(analyzeMmd(source)).toEqual([]);
    expect(parseMmd(source).children).toEqual([{ type: "markdown", content: source }]);
  });
  it("preserves code tabs but dedents Markdown lists, quotes and tables", () => {
    const code = parseMmd("  :::code\n  \tconst answer = 42;\n  :::").children[0];
    if (code.type !== "block") throw Error("Expected code");
    expect(code.children[0]).toEqual({ type: "markdown", content: "\tconst answer = 42;" });
    const note = parseMmd("  :::note\n    - list\n    > quote\n    | a | b |\n  :::").children[0];
    if (note.type !== "block") throw Error("Expected note");
    expect(note.children[0]).toEqual({ type: "markdown", content: "- list\n> quote\n| a | b |" });
  });
  it("accepts every enabled insert template at indent 0, 2 and 4", () => {
    for (const template of Object.values(INSERT_TEMPLATES)) {
      if (template.disabled) continue;
      for (const indent of ["", "  ", "    "]) {
        const source = template.build("").split("\n").map(line => indent + line).join("\n");
        expect(collectMmdErrors(parseMmd(source)), source).toEqual([]);
      }
    }
  });
  it("survives pathological nesting", () => { expect(() => analyzeMmd(":::note\n".repeat(1500) + ":::\n".repeat(1500))).not.toThrow(); });
});

describe("compiler diagnostics", () => {
  const codes = (source: string) => analyzeMmd(source).map(item => item.code);
  it.each([
    [":::note", "unclosed-block"], [":::", "stray-closer"], [":::nore\nx\n:::", "unknown-block"],
    [":::section\nx\n:::", "missing-attr"], [':::note{align="middle"}\nx\n:::', "invalid-attr-value"],
    [':::note{algin="left"}\nx\n:::', "unknown-attr"], [':::note{title="a" title="b"}\nx\n:::', "duplicate-attr"],
    [":::Note", "malformed-fence"], ["::: note", "malformed-fence"], ["::note", "malformed-fence"], ["::::note", "malformed-fence"],
    [':::note{title="x"', "malformed-fence"], [":::note{title='x'}", "malformed-fence"], [":::note{title=x}", "malformed-fence"],
    [':::note{title="x"} tail', "malformed-fence"], [":::code\n:::", "empty-body"],
    [':::svg\n<svg><script /></svg>\n:::', "svg-unsafe"], [" \t:::note\nx\n \t:::", "mixed-indent"],
    [":::note\n".repeat(10) + ":::\n".repeat(10), "nesting-depth"],
  ])("reports %s as %s", (source, code) => expect(codes(source)).toContain(code));
  it("blames the missing inner closer while preserving LIFO rendering", () => {
    const source = ":::card\n  :::note\n    body\n:::";
    const issue = analyzeMmd(source).find(item => item.code === "unclosed-block")!;
    expect(issue.line).toBe(2); expect(issue.relatedFrom).toBe(source.lastIndexOf(":::"));
    expect(collectMmdErrors(parseMmd(source))[0].position?.openLine).toBe(1);
    const change = issue.fixes![0].changes[0];
    expect(analyzeMmd(source.slice(0, change.from) + change.insert + source.slice(change.to))).toEqual([]);
  });
  it("blames the outer opener when its closer is missing", () => {
    expect(analyzeMmd(":::card\n  :::note\nx\n  :::").find(item => item.code === "unclosed-block")?.line).toBe(1);
  });
  it("does not throw on arbitrary source", () => {
    let seed = 123;
    for (let i = 0; i < 200; i++) {
      let source = ""; for (let j = 0; j < 80; j++) { seed = (seed * 1664525 + 1013904223) >>> 0; source += ':{}"\n\t abc<>='[seed % 13]; }
      expect(() => analyzeMmd(source)).not.toThrow();
      for (const item of analyzeMmd(source)) expect(item.to).toBeLessThanOrEqual(source.length);
    }
  });
  it("scans 5000 ordinary lines within the interactive budget", () => {
    const source = "A line of ordinary Markdown.\n".repeat(5000);
    analyzeMmd(source); const start = performance.now(); analyzeMmd(source);
    expect(performance.now() - start).toBeLessThan(30);
    expect(scanMmd(source)).toHaveLength(5000);
  });
});

describe("pure editor commands", () => {
  it("indents list items by marker width", () => { expect(indentLines("1. item", 0, 0)[0].insert).toBe("   "); expect(indentLines("- item", 0, 0)[0].insert).toBe("  "); });
  it("outdents tabs and spaces", () => { expect(indentLines("\ttext", 0, 0, true)[0].to).toBe(1); expect(indentLines("  text", 0, 0, true)[0].to).toBe(2); });
  it("auto-closes only unclosed blocks", () => { expect(enterEdit(":::note", 7).changes.insert).toBe("\n  \n:::"); expect(enterEdit(":::note\n:::", 7).changes.insert).toBe("\n  "); });
  it("continues and removes empty list markers", () => { expect(enterEdit("1. text", 7).changes.insert).toBe("\n2. "); expect(enterEdit("- ", 2).changes).toEqual({ from: 0, to: 2, insert: "" }); });
  it("deletes an indent and aligns electric closers", () => { expect(smartBackspace("    ", 4)?.from).toBe(2); expect(electricCloser(":::note\n  :::", 13)?.insert).toBe(":::"); });
  it("derives completions from the spec", () => { expect(blockCandidates().some(item => item.label === "card")).toBe(true); expect(enumValues("card", "align")).toContain("left"); });
});
