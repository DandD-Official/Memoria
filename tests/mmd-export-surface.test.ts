import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MmdExportSurface } from "@/components/exports/mmd-export-surface";

describe("MmdExportSurface", () => {
  it("renders the real MMD component tree in export mode", () => {
    const markup = renderToStaticMarkup(createElement(MmdExportSurface, {
      title: "Export surface",
      content: ':::details{title="Open details"}\nVisible body.\n:::\n\n:::svg{alt="Inline visual"}\n<svg viewBox="0 0 10 10"><rect width="10" height="10" /></svg>\n:::',
    }));

    expect(markup).toContain('data-render-mode="export"');
    expect(markup).toContain('open=""');
    expect(markup).toContain('data-export-asset="inline-svg"');
    expect(markup).toContain("<svg");
    expect(markup).toContain("Open details");
    expect(markup).toContain("Visible body.");
  });
});
