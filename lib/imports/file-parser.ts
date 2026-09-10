import { parseFrontmatter } from "@/lib/markdown-frontmatter";

export const SUPPORTED_EXTENSIONS = ["txt", "md", "pdf", "docx", "pptx", "json"] as const;
export type SupportedExtension = (typeof SUPPORTED_EXTENSIONS)[number];

export const MAX_UPLOAD_SIZE_BYTES = Number(process.env.MAX_UPLOAD_SIZE_BYTES ?? 10 * 1024 * 1024);

export class FileParseError extends Error {}

export interface ExtractedFile {
  text: string;
  extension: SupportedExtension;
  /** Present when the file carried its own title (frontmatter or a Memora JSON export) — prefer this over deriving one from the filename. */
  title?: string;
  description?: string;
  /**
   * True when the source file (PDF/DOCX/PPTX) contains embedded images or
   * other visual media. Memora only
   * imports text, so the caller should surface a clear "images were skipped"
   * notice rather than silently dropping them.
   */
  hasImages?: boolean;
}

function getExtension(filename: string): string {
  const parts = filename.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

/**
 * Extracts plain text (and, where available, the original title/description)
 * from an uploaded note file. This is the single entry point for both the
 * authenticated import route and the guest (stateless) extraction endpoint.
 *
 * Security notes:
 * - Never trust the file extension alone; we also sniff magic bytes and archive
 *   contents for PDF/DOCX/PPTX.
 * - Enforces a max size before doing any parsing work.
 * - All parsing happens server-side; nothing here runs in the browser.
 */
export async function extractTextFromFile(file: File): Promise<ExtractedFile> {
  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    throw new FileParseError(
      `This file is too large. Maximum upload size is ${(MAX_UPLOAD_SIZE_BYTES / (1024 * 1024)).toFixed(0)}MB.`
    );
  }
  if (file.size === 0) {
    throw new FileParseError("This file appears to be empty.");
  }

  const extension = getExtension(file.name);
  if (!SUPPORTED_EXTENSIONS.includes(extension as SupportedExtension)) {
    throw new FileParseError(
      `Unsupported file type ".${extension || "unknown"}". Memoria currently supports .md, .txt, .pdf, .docx, .pptx, and Memoria's own exported .json files.`
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (extension === "pdf") {
    if (buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
      throw new FileParseError("This file isn't a valid PDF. Make sure it wasn't renamed from another format.");
    }
    const { text, hasImages } = await extractPdfText(buffer);
    return { text, extension: "pdf", hasImages };
  }

  if (extension === "docx") {
    // A .docx is a zip archive — the first two bytes are the local-file-header magic "PK".
    if (buffer.subarray(0, 2).toString("ascii") !== "PK") {
      throw new FileParseError("This file isn't a valid .docx. Make sure it wasn't renamed from another format.");
    }
    return await extractDocxText(buffer);
  }

  if (extension === "pptx") {
    // A .pptx is an Office Open XML zip archive. Validate both the ZIP magic
    // bytes and its presentation content type before reading any XML.
    if (buffer.subarray(0, 2).toString("ascii") !== "PK") {
      throw new FileParseError("This file isn't a valid .pptx. Make sure it wasn't renamed from another format.");
    }
    return await extractPptxText(buffer);
  }

  if (extension === "json") {
    return parseJsonImport(buffer);
  }

  // txt or md — both are just UTF-8 text. If it carries a Memora frontmatter
  // block (from a previous export), recover the original title/description
  // instead of falling back to a filename-derived guess.
  const raw = buffer.toString("utf-8").trim();
  if (!raw) {
    throw new FileParseError("This file appears to be empty.");
  }
  const { title, description, content } = parseFrontmatter(raw);
  if (!content.trim()) {
    throw new FileParseError("This file appears to be empty.");
  }
  return { text: content, extension: extension as "txt" | "md", title, description };
}

/**
 * Re-imports a file previously downloaded from Memora's own "Export as
 * JSON" button (memora-note-export / memora-reviewer-export format) when
 * possible, and otherwise falls back to a generic reader that pulls the
 * note text out of whatever shape of JSON was uploaded — see
 * `extractNoteTextFromJson` below.
 */
function parseJsonImport(buffer: Buffer): ExtractedFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(buffer.toString("utf-8"));
  } catch {
    throw new FileParseError("This .json file isn't valid JSON. Double-check it wasn't cut off or edited by hand.");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new FileParseError("This .json file doesn't contain an object or array Memoria can read notes from.");
  }

  const obj = parsed as Record<string, unknown>;
  const isMemoraExport = ["memoria-note-export", "memoria-reviewer-export", "memora-note-export", "memora-reviewer-export"].includes(String(obj.format));
  if (isMemoraExport && typeof obj.content === "string" && obj.content.trim()) {
    return {
      text: obj.content,
      extension: "json",
      title: typeof obj.title === "string" ? obj.title : undefined,
      description: typeof obj.description === "string" ? obj.description : undefined,
    };
  }

  // Generic JSON: read everything inside the file and pull out the note
  // content, preferring a "content"/"notes" field (however deeply the
  // caller nested it) so the import preview shows the actual notes rather
  // than raw JSON.
  const text = extractNoteTextFromJson(parsed);
  const title =
    typeof obj.title === "string" && obj.title.trim()
      ? obj.title
      : typeof obj.name === "string" && obj.name.trim()
        ? obj.name
        : undefined;

  if (text) {
    return { text, extension: "json", title };
  }

  // Nothing recognizable — still let the import succeed rather than reject
  // it outright, but be honest that we couldn't find a "notes" field.
  return {
    text: "```json\n" + JSON.stringify(parsed, null, 2) + "\n```",
    extension: "json",
    title,
  };
}

/**
 * Walks a parsed JSON value looking for note text. Priority order per
 * object: "content" first (per Memora's own export shape), then "notes",
 * falling back through a few other common keys. Arrays are flattened and
 * joined with a section break so a JSON export containing multiple notes
 * still comes through as one readable document.
 */
function extractNoteTextFromJson(value: unknown, depth = 0): string | null {
  if (depth > 6) return null;

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || null;
  }

  if (Array.isArray(value)) {
    const parts = value
      .map((item) => extractNoteTextFromJson(item, depth + 1))
      .filter((v): v is string => Boolean(v));
    return parts.length ? parts.join("\n\n---\n\n") : null;
  }

  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    for (const key of ["content", "notes", "note", "body", "text", "markdown", "md"]) {
      if (key in obj) {
        const nested = extractNoteTextFromJson(obj[key], depth + 1);
        if (nested) return nested;
      }
    }
    return null;
  }

  return null;
}

async function extractPdfText(buffer: Buffer): Promise<{ text: string; hasImages: boolean }> {
  try {
    // pdf-parse is CommonJS; dynamic import keeps it out of the client bundle.
    const pdfParse = (await import("pdf-parse")).default;
    const result = await pdfParse(buffer);
    const text = result.text.trim();
    const hasImages = pdfContainsImages(buffer);
    if (!text) {
      throw new FileParseError(
        hasImages
          ? "This PDF looks like it's made of scanned pages or images rather than selectable text — Memoria can't read text out of images yet, so there was nothing to import."
          : "We couldn't extract any text from this PDF. It may be a scanned image without a text layer."
      );
    }
    return { text, hasImages };
  } catch (err) {
    if (err instanceof FileParseError) throw err;
    throw new FileParseError("We couldn't read this file. Make sure it is a valid, uncorrupted PDF.");
  }
}

/** Cheap heuristic: PDF image XObjects are declared with "/Subtype /Image" in the object dictionary. */
function pdfContainsImages(buffer: Buffer): boolean {
  const sample = buffer.toString("latin1");
  return /\/Subtype\s*\/Image/.test(sample);
}

async function extractDocxText(buffer: Buffer): Promise<ExtractedFile> {
  try {
    // mammoth is CommonJS; dynamic import keeps it out of the client bundle.
    const mammoth = (await import("mammoth")).default;
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value.trim();
    if (!text) {
      throw new FileParseError("We couldn't find any text in this .docx file — it may be empty or image-only.");
    }
    // A .docx is a zip; embedded media is stored as separate entries under
    // word/media/. Their filenames appear as plain ASCII in the archive's
    // local file headers even though the file as a whole is compressed.
    const hasImages = buffer.toString("latin1").includes("word/media/");
    return { text, extension: "docx", hasImages };
  } catch (err) {
    if (err instanceof FileParseError) throw err;
    throw new FileParseError("We couldn't read this file. Make sure it is a valid, uncorrupted .docx document.");
  }
}

interface XmlParagraph {
  text: string;
  level: number;
  bullet: boolean;
}

interface PptxZipArchive {
  files: Record<string, unknown>;
}

/** Extracts ordered slide text from the XML parts inside an Office Open XML presentation. */
async function extractPptxText(buffer: Buffer): Promise<ExtractedFile> {
  try {
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(buffer);
    const filenames = Object.keys(zip.files);
    const readEntry = async (path: string) => {
      const entry = zip.file(path);
      return entry ? entry.async("string") : null;
    };

    const contentTypes = await readEntry("[Content_Types].xml");
    const presentationXml = await readEntry("ppt/presentation.xml");
    if (!contentTypes || !presentationXml || !/presentationml\.presentation\.main\+xml/i.test(contentTypes)) {
      throw new FileParseError("This file isn't a valid PowerPoint presentation. Its Office Open XML parts are incomplete.");
    }
    if (filenames.some((name) => /^ppt\/vbaProject\.bin$/i.test(name))) {
      throw new FileParseError("Macro-enabled PowerPoint files are not supported. Save the presentation as a standard .pptx first.");
    }

    const hasImages = filenames.some((name) => /^ppt\/(?:media|charts|diagrams|embeddings)\//i.test(name));
    const slidePaths = await getPptxSlidePaths(zip, presentationXml, readEntry);
    if (slidePaths.length === 0) {
      throw new FileParseError("We couldn't find any slides in this PowerPoint file.");
    }

    const sections: string[] = [];
    for (const [index, slidePath] of slidePaths.entries()) {
      const slideXml = await readEntry(slidePath);
      if (!slideXml) continue;

      const slide = extractPptxSlide(slideXml);
      const lines = [`## Slide ${index + 1}${slide.title ? `: ${slide.title}` : ""}`];
      lines.push(...slide.paragraphs.map(formatPptxParagraph));

      const notesPath = await getPptxNotesPath(slidePath, readEntry);
      if (notesPath) {
        const notesXml = await readEntry(notesPath);
        const notes = notesXml ? extractPptxSpeakerNotes(notesXml) : "";
        if (notes) lines.push("", "**Speaker notes**", notes);
      }
      if (lines.length > 1) sections.push(lines.join("\n"));
    }

    const text = sections.join("\n\n").trim();
    if (!text) {
      throw new FileParseError("This PowerPoint did not contain any readable slide text. It may be image-only.");
    }
    return { text, extension: "pptx", hasImages };
  } catch (err) {
    if (err instanceof FileParseError) throw err;
    throw new FileParseError("We couldn't read this file. Make sure it is a valid, uncorrupted .pptx presentation.");
  }
}

async function getPptxSlidePaths(
  zip: PptxZipArchive,
  presentationXml: string,
  readEntry: (path: string) => Promise<string | null>
): Promise<string[]> {
  const relationshipXml = await readEntry("ppt/_rels/presentation.xml.rels");
  const relationships = new Map<string, string>();
  for (const match of relationshipXml?.matchAll(/<Relationship\b([^>]*)\/?>(?:<\/Relationship>)?/gi) ?? []) {
    const id = readXmlAttribute(match[1], "Id");
    const target = readXmlAttribute(match[1], "Target");
    if (id && target) relationships.set(id, resolveZipPath("ppt/presentation.xml", target));
  }

  const ordered = [...presentationXml.matchAll(/<p:sldId\b([^>]*)\/?>(?:<\/p:sldId>)?/gi)]
    .map((match) => readXmlAttribute(match[1], "r:id") ?? readXmlAttribute(match[1], "id"))
    .map((id) => (id ? relationships.get(id) : undefined))
    .filter((path): path is string => typeof path === "string" && /^ppt\/slides\/slide\d+\.xml$/i.test(path));
  if (ordered.length) return ordered;

  return Object.keys(zip.files)
    .filter((path) => /^ppt\/slides\/slide\d+\.xml$/i.test(path))
    .sort((a, b) => Number(a.match(/slide(\d+)\.xml$/i)?.[1]) - Number(b.match(/slide(\d+)\.xml$/i)?.[1]));
}

async function getPptxNotesPath(
  slidePath: string,
  readEntry: (path: string) => Promise<string | null>
): Promise<string | null> {
  const filename = slidePath.split("/").pop();
  if (!filename) return null;
  const relationshipPath = `${slidePath.slice(0, slidePath.lastIndexOf("/"))}/_rels/${filename}.rels`;
  const relationshipXml = await readEntry(relationshipPath);
  if (!relationshipXml) return null;
  const match = [...relationshipXml.matchAll(/<Relationship\b([^>]*)\/?>(?:<\/Relationship>)?/gi)].find((item) => /notesSlide/i.test(readXmlAttribute(item[1], "Type") ?? ""));
  const target = match ? readXmlAttribute(match[1], "Target") : null;
  return target ? resolveZipPath(slidePath, target) : null;
}

function extractPptxSlide(xml: string): { title?: string; paragraphs: XmlParagraph[] } {
  const titleShape = [...xml.matchAll(/<p:sp\b[\s\S]*?<\/p:sp>/gi)].find((match) => /<p:ph\b[^>]*\btype=["'](?:title|ctrTitle)["']/i.test(match[0]));
  const title = titleShape ? extractXmlParagraphs(titleShape[0]).map((paragraph) => paragraph.text).join(" ").trim() : undefined;
  const paragraphs = extractXmlParagraphs(xml);
  if (!title) return { paragraphs };

  let titleRemoved = false;
  return {
    title,
    paragraphs: paragraphs.filter((paragraph) => {
      if (!titleRemoved && paragraph.text === title) {
        titleRemoved = true;
        return false;
      }
      return true;
    }),
  };
}

function extractPptxSpeakerNotes(xml: string): string {
  const bodyShape = [...xml.matchAll(/<p:sp\b[\s\S]*?<\/p:sp>/gi)].find((match) => /<p:ph\b[^>]*\btype=["']body["']/i.test(match[0]));
  return extractXmlParagraphs(bodyShape?.[0] ?? xml)
    .map((paragraph) => paragraph.text)
    .join("\n")
    .trim();
}

function extractXmlParagraphs(xml: string): XmlParagraph[] {
  return [...xml.matchAll(/<a:p(?:\s[^>]*)?>[\s\S]*?<\/a:p>/gi)]
    .map((match) => {
      const paragraphXml = match[0];
      const text = [...paragraphXml.matchAll(/<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/gi)]
        .map((textMatch) => decodeXmlText(textMatch[1]))
        .join("")
        .replace(/\s+/g, " ")
        .trim();
      if (!text) return null;
      const paragraphProperties = paragraphXml.match(/<a:pPr\b([^>]*)\/?>/i)?.[1] ?? "";
      const level = Number(readXmlAttribute(paragraphProperties, "lvl") ?? 0) || 0;
      const bullet = /<a:bu(?:Char|AutoNum|Blip)\b/i.test(paragraphXml) && !/<a:buNone\b/i.test(paragraphXml);
      return { text, level, bullet };
    })
    .filter((paragraph): paragraph is XmlParagraph => Boolean(paragraph));
}

function formatPptxParagraph(paragraph: XmlParagraph): string {
  const indentation = "  ".repeat(Math.min(paragraph.level, 6));
  return paragraph.bullet ? `${indentation}- ${paragraph.text}` : `${indentation}${paragraph.text}`;
}

function readXmlAttribute(attributes: string, name: string): string | undefined {
  const escapedName = name.replace(":", "\\:");
  const match = attributes.match(new RegExp(`(?:^|\\s)${escapedName}\\s*=\\s*["']([^"']*)["']`, "i"));
  return match ? decodeXmlText(match[1]) : undefined;
}

function decodeXmlText(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function resolveZipPath(sourcePath: string, target: string): string {
  const sourceDirectory = sourcePath.slice(0, sourcePath.lastIndexOf("/"));
  const parts = `${sourceDirectory}/${target}`.split("/");
  const resolved: string[] = [];
  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") resolved.pop();
    else resolved.push(part);
  }
  return resolved.join("/");
}
