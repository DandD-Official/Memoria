import { describe, expect, it } from "vitest";
import { buildOcrExtractionPrompt } from "@/lib/prompts/ocr-prompt";

describe("AI/OCR note import prompt", () => {
  it("uses the shared MMD contract and teaches the tool to preserve visuals as SVG", () => {
    const prompt = buildOcrExtractionPrompt([{ name: "scan.png", text: "# Partial lesson" }], ["scan.png"]);
    expect(prompt).toContain(":::svg");
    expect(prompt).toContain("self-contained");
    expect(prompt).toContain(":::image-request");
    expect(prompt).toMatch(/exactly one outer/i);
    expect(prompt).toContain("scan.png");
  });
});
