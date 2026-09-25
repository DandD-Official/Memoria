import { buildMmdOutputRules } from "@/lib/mmd/ai-instructions";
import { buildOcrKeepInstructions, DEFAULT_OCR_KEEP, type OcrKeepOption } from "@/lib/prompts/ocr-options";

/** Builds the prompt shown when a note import needs external AI/OCR help.
 * Keep this on the same MMD contract as note/reviewer generation so pasted
 * OCR output can contain the inline `:::svg` visual block and render through
 * the normal note reader. */
export function buildOcrExtractionPrompt(
  extracted: Array<{ name: string; text: string }>,
  missingFiles: string[],
  keep: OcrKeepOption[] = DEFAULT_OCR_KEEP
): string {
  const partial = extracted
    .map((item) => `FILE: ${item.name}\nPARTIAL TEXT:\n${item.text}`)
    .join("\n\n---\n\n");
  const missing = missingFiles.join(", ");

  return `You are an AI/OCR extraction tool helping import study material into Memoria.

TASK
Extract every readable word, heading, label, table, equation, and diagram annotation from every page of the attached PDF(s) or source image(s). Preserve the original reading order, wording, and structure. Do not summarize, omit, or invent missing text. If something is unclear or illegible, write [UNCLEAR: ...] instead of guessing. Inspect the original rendered pages, not only the partial text extraction. If the originals are not attached, ask for them; partial text cannot establish a diagram's relationships.

VISUALS
If a source contains a chart, process flow, timeline, hierarchy, or other visual and you can faithfully reconstruct its visible structure and labels, represent it as one self-contained HTML/SVG visual inside a :::svg block with meaningful alt text. Do not invent values, labels, relationships, or styling that are not visible in the source. If it cannot be faithfully reconstructed as SVG, preserve the readable annotations and write [VISUAL NOT RECONSTRUCTED: ...] instead of requesting an image.

PDF FIGURE RECONSTRUCTION
- Inventory figures page by page, including vector drawings, legends, axis labels, footnotes, table headings and multi-panel diagrams. Identify each reconstructed figure by source page and figure title in its caption.
- Preserve all visible labels, values, units, scales, direction of arrows, grouping, branches and exceptions. Do not silently replace a technical figure with a simplified generic flowchart. Never infer precise chart values from unclear pixels.
- Improve spacing, alignment, contrast and typography using the SVG quality contract while preserving the figure's meaning. Reflow a crowded figure into clearly ordered panels; retain all annotations as visible text or an accompanying data table.
- Provide a readable text explanation of each figure so information remains available without the visual. Keep uncertainty markers adjacent to the relevant item. Do not add educational background during extraction; additions belong to a later study-guide step.
- Compare the reconstructed figure with its original page before finishing: account for every component and relationship. List unreconstructed or unreadable portions explicitly so the user can supply a clearer source.

${buildMmdOutputRules()}

${buildOcrKeepInstructions(keep)}

${missing ? `Files needing OCR: ${missing}\n\n` : ""}${partial ? `Merge the OCR result with this partial extraction without duplicating text:\n\n${partial}\n\n` : ""}Return only the complete final Memoria Markdown document using the outer-fence rule above. Do not include explanations or commentary outside that fence.`;
}
