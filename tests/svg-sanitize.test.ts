import { describe, expect, it } from "vitest";
import { sanitizeSvgMarkup } from "@/lib/svg/sanitize";

describe("inline SVG sanitizer", () => {
  it("accepts a simple diagram and reconstructs its markup", () => {
    const result = sanitizeSvgMarkup('<svg viewBox="0 0 100 60"><rect x="5" y="5" width="90" height="50" fill="#fff" /></svg>');
    expect(result).toContain('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 60">');
    expect(result).toContain('<rect x="5" y="5" width="90" height="50" fill="#fff" />');
  });

  it.each([
    '<svg><script>alert(1)</script></svg>',
    '<svg><rect onclick="alert(1)" /></svg>',
    '<svg><foreignObject><div>unsafe</div></foreignObject></svg>',
    '<svg><use href="https://evil.example/icon.svg#x" /></svg>',
    '<svg><rect style="fill:url(javascript:alert(1))" /></svg>',
  ])("rejects executable or embedded content: %s", (source) => {
    expect(sanitizeSvgMarkup(source)).toBeNull();
  });

  it("rejects unknown elements and oversized payloads", () => {
    expect(sanitizeSvgMarkup("<svg><iframe /></svg>")).toBeNull();
    expect(sanitizeSvgMarkup(`<svg>${"x".repeat(500_001)}</svg>`)).toBeNull();
  });
});
