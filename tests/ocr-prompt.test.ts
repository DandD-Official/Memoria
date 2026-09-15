import { describe, expect, it } from "vitest";
import { buildOcrExtractionPrompt } from "@/lib/prompts/ocr-prompt";

describe("AI/OCR note import prompt", () => {
  it("uses the shared MMD contract and teaches the tool to preserve visuals as SVG", () => {
    const prompt = buildOcrExtractionPrompt([{ name: "scan.png", text: "# Partial lesson" }], ["scan.png"]);
    expect(prompt).toContain(":::svg");
    expect(prompt).toContain("self-contained");
    expect(prompt).toContain("VISUAL NOT RECONSTRUCTED");
    expect(prompt).not.toContain(":::image-request");
    expect(prompt).toMatch(/exactly one outer/i);
    expect(prompt).toContain("scan.png");
    expect(prompt).toContain("USER KEEP PREFERENCES");
    expect(prompt).toContain("SVG visuals");
  });

  it("puts a user's keep selection ahead of the OCR tool's defaults", () => {
    const prompt = buildOcrExtractionPrompt([], ["scan.png"], ["svg"]);
    expect(prompt).toContain("Keep and prioritize these content types in the final note: SVG visuals.");
    expect(prompt).toContain("Do not spend output on these unselected content types: Readable text, Tables, Equations.");
  });
});
