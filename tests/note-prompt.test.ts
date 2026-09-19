import { describe, expect, it } from "vitest";
import { buildNoteReformatPrompt, buildSourcePackage, buildTopicNotePrompt } from "@/lib/prompts/note-prompt";

describe("topic note prompting", () => {
  it("builds a self-contained prompt for a user-provided topic", () => {
    const prompt = buildTopicNotePrompt("TCP congestion control", "visual_creative");

    expect(prompt).toContain("TCP congestion control");
    expect(prompt).toContain("self-contained educational note");
    expect(prompt).toContain("purposeful visuals");
    expect(prompt).toContain(":::svg");
    expect(prompt).toContain("MEMORIA MARKDOWN OUTPUT RULES");
  });
});

describe("visual and creative reviewer prompting", () => {
  const notes = [{ title: "Photosynthesis", content: "Light energy drives the process. Carbon dioxide becomes glucose." }];

  it("asks for purposeful visuals without allowing invented facts", () => {
    const prompt = buildNoteReformatPrompt(notes, "visual_creative");

    expect(prompt).toContain("visually rich, memorable reviewer");
    expect(prompt).toContain("process flow, timeline, hierarchy, comparison");
    expect(prompt).toContain(":::svg");
    expect(prompt).toContain("self-contained HTML/SVG");
    expect(prompt).not.toContain(":::image-request");
    expect(prompt).not.toContain(":::diagram");
    expect(prompt).toContain("must never introduce facts");
    expect(prompt).toContain("MEMORIA MARKDOWN OUTPUT RULES");
  });

  it("includes the visual style in downloadable source packages", () => {
    const sourcePackage = buildSourcePackage(
      [{ ...notes[0], id: "note-1", sourceType: "TEXT", updatedAt: new Date("2026-01-01T00:00:00.000Z") }],
      "visual_creative"
    );

    expect(sourcePackage).toContain("Visual & Creative");
    expect(sourcePackage).toContain("purposeful self-contained HTML/SVG visuals");
  });
});
