import { describe, expect, it } from "vitest";
import { getMissingTemplates, INSERT_TEMPLATES } from "@/lib/mmd/editor-templates";
import { BLOCK_DEFS } from "@/lib/mmd/spec-blocks";
import { parseMmd, collectMmdErrors } from "@/lib/mmd/parser";
import { isBlockNode } from "@/lib/mmd/ast";

describe("editor insert templates stay in sync with the parser schema", () => {
  it("has exactly one template per BLOCK_DEFS entry and no extras", () => {
    const { missingTemplate, missingBlockDef } = getMissingTemplates();
    expect(missingTemplate).toEqual([]);
    expect(missingBlockDef).toEqual([]);
  });

  it("every enabled template's default insertion parses with zero mmd-errors", () => {
    for (const [name, template] of Object.entries(INSERT_TEMPLATES)) {
      if (template.disabled) continue;
      const source = template.build("");
      const doc = parseMmd(source);
      const errors = collectMmdErrors(doc);
      expect(errors, `:::${name} default insertion should parse cleanly:\n${source}`).toHaveLength(0);
    }
  });

  it("every enabled template's default insertion produces the expected block name at the top level", () => {
    for (const [name, template] of Object.entries(INSERT_TEMPLATES)) {
      if (template.disabled) continue;
      // "columns" and "gallery" templates insert a parent block plus
      // required children in one go — still expect that parent block name
      // to appear somewhere at the top level.
      const source = template.build("");
      const doc = parseMmd(source);
      const topLevelBlocks = doc.children.filter(isBlockNode).map((n) => n.block);
      expect(topLevelBlocks, `:::${name} should produce a top-level ${name} block`).toContain(name);
    }
  });

  it("disabled templates are still valid MMD if ever enabled (no syntax rot)", () => {
    for (const [name, template] of Object.entries(INSERT_TEMPLATES)) {
      if (!template.disabled) continue;
      const source = template.build("caption text");
      const doc = parseMmd(source);
      // Diagram's template intentionally has an empty id (there's nothing
      // to reference yet), which is a real validation error — that's
      // expected and fine. Just confirm it's the *expected* kind of
      // error, not an unknown-block-type typo.
      const errors = collectMmdErrors(doc);
      for (const err of errors) {
        expect(err.reason, `unexpected error in disabled template :::${name}`).not.toMatch(/Unknown block type/);
      }
    }
  });

  it("every BLOCK_DEFS category is a known display category", () => {
    const validCategories = new Set(["callout", "educational", "layout", "media", "diagram", "ai"]);
    for (const def of Object.values(BLOCK_DEFS)) {
      expect(validCategories.has(def.category), `unexpected category on ${def.name}`).toBe(true);
    }
  });
});
