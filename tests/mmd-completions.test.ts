import { describe, expect, it } from "vitest";
import { CompletionContext } from "@codemirror/autocomplete";
import { EditorState } from "@codemirror/state";
import { completeMmd } from "@/lib/mmd/completions";

function complete(doc: string, explicit = false) {
  return completeMmd(new CompletionContext(EditorState.create({ doc }), doc.length, explicit));
}

describe("MMD suggestions", () => {
  it("suggests blocks as the fence is typed", async () => {
    expect((await complete(":::no"))?.options.some(option => option.label === "note")).toBe(true);
    expect((await complete("::"))?.options.some(option => option.label === ":note")).toBe(true);
    expect((await complete(":::no"))?.from).toBe(3);
  });
  it("offers Markdown and complete MMD snippets on explicit invocation", async () => {
    const options = (await complete("", true))?.options;
    expect(options?.some(option => option.label === "heading")).toBe(true);
    expect(options?.some(option => option.label === ":::note")).toBe(true);
    expect(await complete("ordinary prose")).toBeNull();
  });
  it("excludes attributes already present and stops after the closing brace", async () => {
    expect((await complete(':::note{title="My note" '))?.options.some(option => option.label === "title")).toBe(false);
    expect(await complete(':::note{title="My note"}')).toBeNull();
  });
  it("suggests schema values inside quotes without consuming the quote", async () => {
    const result = await complete(':::card{type="');
    expect(result?.from).toBe(14);
    expect(result?.options.length).toBeGreaterThan(0);
  });
});
