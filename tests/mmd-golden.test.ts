import { expect, it } from "vitest";
import golden from "./fixtures/mmd-legacy-golden.json";
import { parseMmd } from "@/lib/mmd/parser";
import { EXAMPLE_SYNTAX } from "@/lib/mmd/ai-instructions";
function withoutMetadata(value: unknown): unknown { return JSON.parse(JSON.stringify(value, (key, item) => key === "position" ? undefined : item)); }
function semantic(value: unknown): unknown { return JSON.parse(JSON.stringify(value, (key, item) => key === "position" || key === "raw" ? undefined : item)); }
it("matches the original parser AST for all fixtures, templates and AI examples", () => {
  for (const item of golden) expect(withoutMetadata(parseMmd(item.source)), item.name).toEqual(item.expected);
});
it("renders flush-left AI examples and their indented equivalents identically", () => {
  for (const source of Object.values(EXAMPLE_SYNTAX)) expect(semantic(parseMmd(source.split("\n").map(line => `  ${line}`).join("\n")))).toEqual(semantic(parseMmd(source)));
});
