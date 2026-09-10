import { describe, expect, it } from "vitest";
import { buildNoteReformatPrompt, buildSourcePackage } from "@/lib/prompts/note-prompt";

describe("visual and creative reviewer prompting", () => {
  const notes = [{ title: "Photosynthesis", content: "Light energy drives the process. Carbon dioxide becomes glucose." }];

  it("asks for purposeful visuals without allowing invented facts", () => {
    const prompt = buildNoteReformatPrompt(notes, "visual_creative");

    expect(prompt).toContain("visually rich, memorable reviewer");
    expect(prompt).toContain("process flow, timeline, hierarchy, comparison");
    expect(prompt).toContain(":::svg");
    expect(prompt).toContain(":::image-request");
    expect(prompt).toContain("must never introduce facts");
    expect(prompt).toContain("MEMORIA MARKDOWN OUTPUT RULES");
  });

  it("includes the visual style in downloadable source packages", () => {
    const sourcePackage = buildSourcePackage(
      [{ ...notes[0], id: "note-1", sourceType: "TEXT", updatedAt: new Date("2026-01-01T00:00:00.000Z") }],
      "visual_creative"
    );

    expect(sourcePackage).toContain("Visual & Creative");
    expect(sourcePackage).toContain("purposeful visuals");
  });
});
