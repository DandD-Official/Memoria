import { describe, expect, it } from "vitest";
import { buildStudyVisualSvg } from "@/lib/svg/templates";

describe("study SVG templates", () => {
  it.each(["concept-card", "process-flow", "comparison"] as const)("creates a safe %s SVG asset", (template) => {
    const svg = buildStudyVisualSvg({ title: "OSI <model>", purpose: "Explain packet flow & layers", template });
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    expect(svg).toContain("&lt;model&gt;");
    expect(svg).toContain("&amp;");
    expect(svg).not.toContain("<script");
  });
});
