import { buildMmdOutputRules } from "@/lib/mmd/ai-instructions";

/** Builds the prompt shown when a note import needs external AI/OCR help.
 * Keep this on the same MMD contract as note/reviewer generation so pasted
 * OCR output can contain the inline `:::svg` visual block and render through
 * the normal note reader. */
export function buildOcrExtractionPrompt(
  extracted: Array<{ name: string; text: string }>,
  missingFiles: string[]
): string {
  const partial = extracted
    .map((item) => `FILE: ${item.name}\nPARTIAL TEXT:\n${item.text}`)
    .join("\n\n---\n\n");
  const missing = missingFiles.join(", ");

  return `You are an AI/OCR extraction tool helping import study material into Memoria.

TASK
Extract every readable word, heading, label, table, equation, and diagram annotation from the attached source image(s). Preserve the original reading order, wording, and structure. Do not summarize, omit, or invent missing text. If something is unclear or illegible, write [UNCLEAR: ...] instead of guessing.

VISUALS
If a source contains a diagram, chart, process flow, timeline, hierarchy, or other visual and you can faithfully reconstruct its visible structure and labels, represent it as one self-contained :::svg block with meaningful alt text. Do not invent values, labels, relationships, or styling that are not visible in the source. If it cannot be faithfully reconstructed as SVG, preserve the readable annotations and use :::image-request{purpose="..." alt="..."} to identify the visual that still needs to be supplied.

${buildMmdOutputRules()}

${missing ? `Files needing OCR: ${missing}\n\n` : ""}${partial ? `Merge the OCR result with this partial extraction without duplicating text:\n\n${partial}\n\n` : ""}Return only the complete final Memoria Markdown document using the outer-fence rule above. Do not include explanations or commentary outside that fence.`;
}
