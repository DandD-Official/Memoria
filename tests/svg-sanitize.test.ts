import { describe, expect, it } from "vitest";
import { sanitizeSvgMarkup } from "@/lib/svg/sanitize";
import { namespaceSvgIds } from "@/lib/svg/namespace";
import { generatedVisualIssues } from "@/lib/ai/output-quality";
import sharp from "sharp";

const richFigure = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 800 420" width="100%" height="100%" version="1.1" aria-labelledby="title" aria-describedby="description">
  <title id="title">PivotTable field areas</title><desc id="description">Rows, columns, values, and filters</desc>
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%" spreadMethod="pad"><stop offset="0%" stop-color="#f8fafc"/><stop offset="100%" stop-color="#dbeafe"/></linearGradient>
    <radialGradient id="highlight" fx="30%" fy="30%" fr="0%"><stop stop-color="white"/><stop offset="1" stop-color="#86efac"/></radialGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB"><feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#0f172a" flood-opacity="0.2"/></filter>
    <clipPath id="clip"><rect width="800" height="420" rx="20"/></clipPath>
    <mask id="mask" mask-type="luminance"><rect width="800" height="420" fill="white"/></mask>
    <pattern id="dots" width="10" height="10" patternUnits="userSpaceOnUse"><circle cx="5" cy="5" r="1"/></pattern>
    <marker id="arrow" markerUnits="strokeWidth" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z"/></marker>
    <symbol id="field"><rect width="160" height="60" rx="12" fill="url(#highlight)"/></symbol>
    <path id="labelPath" d="M40 360H740" pathLength="700"/>
  </defs>
  <rect width="800" height="420" fill="url('#bgGrad')" clip-path="url(#clip)"/>
  <g filter="url(#shadow)" mask="url(#mask)"><use xlink:href="#field" x="40" y="80" width="160" height="60"/><use href="#field" x="260" y="80" width="160" height="60"/></g>
  <path d="M205 110H250" stroke="#334155" marker-end="url(#arrow)" vector-effect="non-scaling-stroke"/>
  <text x="60" y="110" font-size="20" paint-order="stroke fill">Rows<tspan x="60" dy="24" dx="2">Group records</tspan></text>
  <text font-size="20"><textPath href="#labelPath" startOffset="50%" text-anchor="middle">Arrange fields to summarize records</textPath></text>
</svg>`;

describe("inline SVG sanitizer", () => {
  it("accepts a simple diagram and reconstructs its markup", () => {
    const result = sanitizeSvgMarkup('<svg viewBox="0 0 100 60"><rect x="5" y="5" width="90" height="50" fill="#fff" /></svg>');
    expect(result).toContain('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 60">');
    expect(result).toContain('<rect x="5" y="5" width="90" height="50" fill="#fff" />');
  });

  it("preserves rich AI figures through validation, ID isolation, and raster export", async () => {
    const safe = sanitizeSvgMarkup(richFigure);
    expect(safe).not.toBeNull();
    expect(sanitizeSvgMarkup(safe!)).toBe(safe);
    expect(generatedVisualIssues(`:::svg{alt="PivotTable areas"}\n${richFigure}\n:::`)).toEqual([]);
    const isolated = namespaceSvgIds(safe!, "rich");
    expect(isolated).toContain('fill="url(#figure-rich-bgGrad)"');
    expect(isolated).toContain('filter="url(#figure-rich-shadow)"');
    expect(isolated).toContain('xlink:href="#figure-rich-field"');
    expect(isolated).toContain('aria-describedby="figure-rich-description"');
    expect(isolated).toContain('dy="24"');
    const rendered = await sharp(Buffer.from(isolated)).png().toBuffer({ resolveWithObject: true });
    expect(rendered.info.width).toBe(800);
    expect(rendered.info.height).toBe(420);
  });

  it("supports composed filters and component transfer", () => {
    const source = `<svg><defs><filter id="effect" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse">
      <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur"/><feOffset in="blur" dx="2" dy="3" result="offset"/>
      <feFlood flood-color="#000" flood-opacity="0.2" result="color"/><feComposite in="color" in2="offset" operator="in" result="shadow"/>
      <feColorMatrix in="SourceGraphic" type="saturate" values="0.8" result="tint"/>
      <feComponentTransfer in="tint"><feFuncR type="linear" slope="1.1" intercept="0"/><feFuncA type="gamma" amplitude="1" exponent="1" offset="0"/></feComponentTransfer>
      <feMerge><feMergeNode in="shadow"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter></defs><rect width="50" height="50" filter="url(#effect)"/></svg>`;
    const safe = sanitizeSvgMarkup(source);
    expect(safe).toContain('<feMergeNode in="shadow" />');
    expect(safe).toContain('slope="1.1"');
    expect(sanitizeSvgMarkup(safe!)).toBe(safe);
  });

  it("inlines safe filter, typography, and quoted fragment styles", () => {
    const safe = sanitizeSvgMarkup(`<svg><style>.label { paint-order: stroke fill; } #label { font-size: 20px; }</style><defs><filter id="shadow"><feDropShadow stdDeviation="2"/></filter></defs><text id='label' class='label' style="filter: url('#shadow'); word-spacing: 2px;">Label</text></svg>`);
    expect(safe).toContain('filter="url(#shadow)"');
    expect(safe).toContain('paint-order="stroke fill"');
    expect(safe).toContain('font-size="20px"');
    expect(safe).not.toContain("<style");
    expect(sanitizeSvgMarkup(safe!)).toBe(safe);
  });

  it("normalizes common AI-escaped SVG and safely inlines its style block", () => {
    const source = '\\<svg xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)" viewBox="0 0 100 60">\\<style>text { fill: #333; font-size: 13px; } .arrow { stroke: #94a3b8; marker-end: url(#arrow); }</style>\\<defs>\\<marker id="arrow" />\\</defs>\\<text class="arrow">Functions\\</text>\\</svg>';
    const result = sanitizeSvgMarkup(source);

    expect(result).not.toBeNull();
    expect(result).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(result).toContain('font-size="13px"');
    expect(result).toContain('marker-end="url(#arrow)"');
    expect(result).not.toContain("<style");
    expect(result).not.toContain("\\<");
  });

  it.each([
    '<svg><script>alert(1)</script></svg>',
    '<svg><rect onclick="alert(1)" /></svg>',
    '<svg><foreignObject><div>unsafe</div></foreignObject></svg>',
    '<svg><use href="https://evil.example/icon.svg#x" /></svg>',
    '<svg><rect style="fill:url(javascript:alert(1))" /></svg>',
    '<svg><feImage href="https://evil.example/image.svg" /></svg>',
    '<svg><image href="data:image/svg+xml;base64,PHN2Zz4=" /></svg>',
    '<svg><animate attributeName="href" to="javascript:alert(1)" /></svg>',
    '<svg><set attributeName="onload" to="alert(1)" /></svg>',
    '<svg><filter onload="alert(1)" /></svg>',
    '<svg><use xlink:href="&#x68;ttps://evil.example/icon.svg#x" /></svg>',
    '<svg xmlns:xlink="https://evil.example"><use xlink:href="#x" /></svg>',
    '<svg><textPath href="javascript:alert(1)">Bad</textPath></svg>',
    '<svg><rect filter="url(&quot;https://evil.example/filter.svg#f&quot;)" /></svg>',
    '<svg><rect filter="url(#f) url(https://evil.example/f)" /></svg>',
    '<svg><rect filter="u\\72l(https://evil.example/f)" /></svg>',
    '<svg><rect filter="u/**/rl(https://evil.example/f)" /></svg>',
    '<!DOCTYPE svg [<!ENTITY remote SYSTEM "https://evil.example">]><svg/>',
  ])("rejects executable or embedded content: %s", (source) => {
    expect(sanitizeSvgMarkup(source)).toBeNull();
  });

  it("rejects unknown elements and oversized payloads", () => {
    expect(sanitizeSvgMarkup("<svg><iframe /></svg>")).toBeNull();
    expect(sanitizeSvgMarkup(`<svg>${"x".repeat(500_001)}</svg>`)).toBeNull();
  });
});
