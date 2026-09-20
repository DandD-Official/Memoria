import { afterEach, describe, expect, it, vi } from "vitest";
import JSZip from "jszip";
import { readFileSync } from "node:fs";
import { createEditablePagesWord, createEditablePagesPdf, type EditablePage } from "@/lib/export/editable-pages";

const background = `data:image/png;base64,${readFileSync("public/brand/memoria/logo.png").toString("base64")}`;
const pages: EditablePage[] = [0, 1].map(index => ({ width: 794, height: 1123, background,
  text: [{ text: `Editable chapter ${index + 1}: <keep> & revise`, x: 48, y: 90, width: 420, height: 24, font: "Georgia", size: 20, color: "22312b", bold: true, italic: false, underline: false },
    { text: "Source link", x: 48, y: 130, width: 100, height: 18, font: "Arial", size: 14, color: "496327", bold: false, italic: true, underline: true, href: "https://example.com/source" }],
}));
afterEach(() => vi.unstubAllGlobals());

describe("editable page exports", () => {
  it("stores editable Unicode text, formatting, hyperlinks, and the original page dimensions in Word", async () => {
    const fixture = [...pages, { ...pages[0], text: [{ ...pages[0].text[0], text: "Recall → 理解 café" }] }];
    const blob = await createEditablePagesWord("Memory", fixture);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const xml = await zip.file("word/document.xml")!.async("string");
    expect(xml).toContain("Editable chapter 1: &lt;keep&gt; &amp; revise");
    expect(xml).toContain("Editable chapter 2");
    expect(xml).toContain("Recall → 理解 café");
    expect(xml.match(/<w:sectPr>/g)).toHaveLength(3);
    expect(xml).toContain('w:w="11910"');
    expect(xml).toContain('w:h="16845"');
    expect(xml).toContain('<w:txbxContent><w:p>');
    expect(xml).toContain('inset="0,0,0,0"');
    expect(xml).toContain('filled="f" stroked="f"');
    expect(xml).toContain('w:ascii="Georgia"');
    expect(xml).toContain('<w:b/>');
    const relationships = await zip.file("word/_rels/document.xml.rels")!.async("string");
    expect(relationships).toContain('Target="https://example.com/source"');
  });

  it("keeps PDF text selectable when server conversion is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Unavailable", { status: 503 })));
    const word = await createEditablePagesWord("Memory", pages);
    const blob = await createEditablePagesPdf("Memory", pages, word);
    const pdfParse = (await import("pdf-parse")).default;
    // Older PDF.js mutates slices; Buffer.slice shares storage, Uint8Array.slice copies.
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const pdf = await pdfParse(bytes as Buffer);
    expect(pdf.numpages).toBe(2);
    expect(pdf.text).toContain("Editable chapter 1");
    expect(pdf.text).toContain("Editable chapter 2");
    expect(pdf.text).toContain("Source link");
  });

  it("does not silently ignore an export rejection", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Too large", { status: 400 })));
    await expect(createEditablePagesPdf("Memory", pages, new Blob())).rejects.toThrow("Could not export PDF");
  });
});
