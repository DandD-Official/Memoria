import { afterEach, describe, expect, it, vi } from "vitest";
import { sanitizeSvgMarkup } from "@/lib/svg/sanitize";
import { generatedVisualIssues } from "@/lib/ai/output-quality";
import { generateWithFallback } from "@/lib/ai/generation";
import { readPdfPage } from "@/lib/imports/pdf-page";
import { buildOcrExtractionPrompt } from "@/lib/prompts/ocr-prompt";
import { applyOcrKeepPreferences } from "@/lib/prompts/ocr-options";
import { namespaceSvgIds } from "@/lib/svg/namespace";
import { jsPDF } from "jspdf";
import { extractTextFromFile } from "@/lib/imports/file-parser";

afterEach(() => vi.unstubAllGlobals());
const valid = ':::svg{alt="Process"}\n<svg viewBox="0 0 720 240"><rect width="100" height="50"></rect><text x="20" y="30">Read &amp; recall</text></svg>\n:::';
const broken = ':::svg{alt="Process"}\n<svg viewBox="0 0 0 0"><rect width="100" height="50"/></svg>\n:::';

describe("SVG rendering regressions", () => {
  it("isolates markers between figures without changing color values", () => {
    const source = '<svg><defs><marker id="arrow"/></defs><path stroke="#abc" marker-end="url(#arrow)"/></svg>';
    const first = namespaceSvgIds(source, "a");
    const second = namespaceSvgIds(source, "b");
    expect(first).toContain('marker-end="url(#figure-a-arrow)"');
    expect(second).toContain('id="figure-b-arrow"');
    expect(first).toContain('stroke="#abc"');
  });
  it("accepts explicitly closed shapes and preserves entities across repeated sanitization", () => {
    const source = '<svg viewBox="0 0 100 100" aria-label="A &amp; B"><rect width="80" height="80"></rect><text>A &amp; B &lt; C</text></svg>';
    const safe = sanitizeSvgMarkup(source);
    expect(safe).toContain('aria-label="A &amp; B"');
    expect(safe).toContain('A &amp; B &lt; C');
    expect(sanitizeSvgMarkup(safe!)).toBe(safe);
  });
  it("rejects duplicate attributes, entity-encoded external references and outside text", () => {
    for (const source of ['<svg><rect fill="red" fill="blue"/></svg>', '<svg><use href="&#106;avascript:alert(1)"/></svg>', 'oops<svg/>', '<svg/>oops']) expect(sanitizeSvgMarkup(source)).toBeNull();
  });
  it("detects broken dimensions, missing markers and incomplete fences", () => {
    expect(generatedVisualIssues(valid)).toEqual([]);
    expect(generatedVisualIssues('```markdown\n' + valid + '\n```')).toEqual([]);
    expect(generatedVisualIssues(broken).join()).toContain("viewBox");
    expect(generatedVisualIssues(valid.replace('</svg>', '<path marker-end="url(#missing)"/></svg>')).join()).toContain("missing marker");
    expect(generatedVisualIssues(valid.slice(0, -3)).length).toBeGreaterThan(0);
  });
  it("repairs a broken visual before returning provider output", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(Response.json({ output_text: broken }))
      .mockResolvedValueOnce(Response.json({ output_text: valid }));
    vi.stubGlobal("fetch", fetcher);
    const result = await generateWithFallback([{ source: "system", provider: "OPENAI", apiKey: "secret" }], "Create a study guide with SVG.");
    expect(result.text).toBe(valid);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetcher.mock.calls[1][1].body).input).toContain("REPAIR REQUIRED");
  });
  it("does not return unrepaired visuals or accept deleting the figure", async () => {
    for (const repair of [broken, "# Guide\nThe visual has been removed."]) {
      const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ output_text: broken })).mockResolvedValueOnce(Response.json({ output_text: repair }));
      vi.stubGlobal("fetch", fetcher);
      await expect(generateWithFallback([{ source: "system", provider: "OPENAI", apiKey: "secret" }], "Create a study guide.")).rejects.toThrow("after repair");
      expect(fetcher).toHaveBeenCalledTimes(2);
    }
  });
});

describe("PDF visual completeness", () => {
  it("detects actual compressed vector PDF graphics without an image XObject", async () => {
    const pdf = new jsPDF({ compress: true });
    pdf.text("A source lesson", 20, 20);
    pdf.rect(20, 30, 70, 30);
    const result = await extractTextFromFile(new File([pdf.output("arraybuffer")], "vector-lesson.pdf"));
    expect(result.text).toContain("A source lesson");
    expect(result.text).toContain("## Page 1");
    expect(result.hasImages).toBe(true);
  });
  it("detects vector paths and keeps page context and word spacing", async () => {
    const result = await readPdfPage({
      pageNumber: 3,
      getOperatorList: async () => ({ fnArray: [91] }),
      getTextContent: async () => ({ items: [
        { str: "Blood", transform: [1, 0, 0, 1, 10, 100], width: 30 },
        { str: "flow", transform: [1, 0, 0, 1, 45, 100], width: 25 },
        { str: "Direction", transform: [1, 0, 0, 1, 10, 80] },
      ] }),
    });
    expect(result).toEqual({ text: "## Page 3\n\nBlood flow\nDirection", hasVisuals: true });
  });
  it("retains readable text when graphics inspection fails", async () => {
    const result = await readPdfPage({ pageNumber: 1, getOperatorList: async () => { throw new Error("unsupported graphic"); }, getTextContent: async () => ({ items: [{ str: "Lesson", transform: [1, 0, 0, 1, 0, 0] }] }) });
    expect(result.hasVisuals).toBe(true);
    expect(result.text).toContain("Lesson");
  });
  it("keeps partial source content when changing OCR preferences repeatedly", () => {
    const prompt = buildOcrExtractionPrompt([{ name: "lesson.pdf", text: "Unique partial source content" }], ["missing.pdf"]);
    const updated = applyOcrKeepPreferences(applyOcrKeepPreferences(prompt, ["svg"]), ["text", "svg"]);
    expect(updated).toContain("Unique partial source content");
    expect(updated).toContain("missing.pdf");
    expect(updated.match(/USER KEEP PREFERENCES/g)).toHaveLength(1);
    expect(updated).toContain("Readable text, SVG visuals");
  });
});
