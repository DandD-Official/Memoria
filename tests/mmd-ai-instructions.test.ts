import { describe, expect, it } from "vitest";
import { buildMmdOutputRules, EXAMPLE_SYNTAX } from "@/lib/mmd/ai-instructions";
import { getSupportedBlockNames } from "@/lib/mmd/spec-blocks";
import { parseMmd, collectMmdErrors } from "@/lib/mmd/parser";

describe("buildMmdOutputRules", () => {
  const rules = buildMmdOutputRules();

  it("mentions every supported block name (except 'column', which only appears nested inside 'columns')", () => {
    for (const name of getSupportedBlockNames()) {
      if (name === "column") continue;
      expect(rules, `rules text should mention :::${name}`).toContain(`:::${name}`);
    }
    // The "columns" example still demonstrates "column" usage even though
    // it has no standalone bullet of its own.
    expect(rules).toContain(":::column\n");
  });

  it("requires exactly one outer markdown code fence", () => {
    expect(rules).toMatch(/exactly ONE outer Markdown code fence/i);
    expect(rules).toContain("```markdown");
    expect(rules.toLowerCase()).toContain("four backticks");
  });

  it("forbids raw HTML and inventing block types", () => {
    expect(rules.toLowerCase()).toContain("raw html");
    expect(rules.toLowerCase()).toContain("invent");
  });

  it("instructs image-request instead of fabricated image URLs", () => {
    expect(rules).toContain(":::image-request");
    expect(rules.toLowerCase()).toMatch(/fake|fabricat/);
  });

  it("every worked example is itself valid MMD", () => {
    // Test the source EXAMPLE_SYNTAX data directly rather than
    // regex-scraping it back out of the rendered prose — a naive regex
    // extraction hits the exact same nested-":::" ambiguity the parser's
    // stack-based tokenizer exists to solve (e.g. the "columns" example
    // contains an inner ":::column ... :::" close before its own outer
    // close), so scraping would be a second, worse parser to maintain.
    const names = Object.keys(EXAMPLE_SYNTAX);
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) {
      const doc = parseMmd(EXAMPLE_SYNTAX[name]);
      const errors = collectMmdErrors(doc);
      expect(errors, `:::${name} example did not parse cleanly:\n${EXAMPLE_SYNTAX[name]}`).toHaveLength(0);
    }
  });

  it("has an example for every supported block except 'column' (nested-only, no standalone example)", () => {
    for (const name of getSupportedBlockNames()) {
      if (name === "column") continue;
      expect(Object.keys(EXAMPLE_SYNTAX), `missing example for :::${name}`).toContain(name);
    }
  });
});
