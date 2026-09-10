import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { extractTextFromFile, FileParseError } from "@/lib/imports/file-parser";

function slideXml(title: string, bullet: string, nestedBullet: string) {
  return `<p:sld><p:cSld><p:spTree>
    <p:sp><p:nvSpPr><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr><p:txBody><a:p><a:r><a:t>${title}</a:t></a:r></a:p></p:txBody></p:sp>
    <p:sp><p:txBody><a:p><a:pPr><a:buChar char="•"/></a:pPr><a:r><a:t>${bullet}</a:t></a:r></a:p><a:p><a:pPr lvl="1"><a:buChar char="•"/></a:pPr><a:r><a:t>${nestedBullet}</a:t></a:r></a:p></p:txBody></p:sp>
  </p:spTree></p:cSld></p:sld>`;
}

async function makePptxFile() {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<Types><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/></Types>`
  );
  zip.file(
    "ppt/presentation.xml",
    `<p:presentation><p:sldIdLst><p:sldId id="2" r:id="rId2"/><p:sldId id="1" r:id="rId1"/></p:sldIdLst></p:presentation>`
  );
  zip.file(
    "ppt/_rels/presentation.xml.rels",
    `<Relationships><Relationship Id="rId1" Target="slides/slide2.xml" Type="slide"/><Relationship Id="rId2" Target="slides/slide1.xml" Type="slide"/></Relationships>`
  );
  zip.file("ppt/slides/slide1.xml", slideXml("Intro &amp; Setup", "First point", "Indented point"));
  zip.file("ppt/slides/slide2.xml", slideXml("Second Slide", "Later point", "Another detail"));
  zip.file(
    "ppt/slides/_rels/slide1.xml.rels",
    `<Relationships><Relationship Id="rId9" Target="../notesSlides/notesSlide1.xml" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide"/></Relationships>`
  );
  zip.file(
    "ppt/notesSlides/notesSlide1.xml",
    `<p:notes><p:sp><p:nvSpPr><p:nvPr><p:ph type="body"/></p:nvPr></p:nvSpPr><p:txBody><a:p><a:r><a:t>Remember this detail.</a:t></a:r></a:p></p:txBody></p:sp></p:notes>`
  );
  zip.file("ppt/media/image1.png", new Uint8Array([1, 2, 3]));

  const bytes = await zip.generateAsync({ type: "uint8array" });
  return new File([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer], "lesson.pptx", { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" });
}

describe("PPTX import", () => {
  it("extracts ordered slide text, bullet hierarchy, speaker notes, and media warnings", async () => {
    const result = await extractTextFromFile(await makePptxFile());

    expect(result.extension).toBe("pptx");
    expect(result.hasImages).toBe(true);
    expect(result.text).toContain("## Slide 1: Intro & Setup");
    expect(result.text).toContain("- First point\n  - Indented point");
    expect(result.text).toContain("**Speaker notes**\nRemember this detail.");
    expect(result.text.indexOf("Intro & Setup")).toBeLessThan(result.text.indexOf("Second Slide"));
  });

  it("rejects a renamed non-PPTX file", async () => {
    const file = new File(["not a zip archive"], "fake.pptx");

    await expect(extractTextFromFile(file)).rejects.toBeInstanceOf(FileParseError);
  });
});
