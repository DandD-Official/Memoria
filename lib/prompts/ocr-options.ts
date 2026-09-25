export const OCR_KEEP_OPTIONS = [
  {
    value: "text",
    label: "Readable text",
    description: "Words, headings, labels, and notes",
  },
  {
    value: "tables",
    label: "Tables",
    description: "Rows, columns, and cell contents",
  },
  {
    value: "equations",
    label: "Equations",
    description: "Formulas and mathematical notation",
  },
  {
    value: "svg",
    label: "SVG visuals",
    description: "Charts, diagrams, and process flows",
  },
] as const;

export type OcrKeepOption = (typeof OCR_KEEP_OPTIONS)[number]["value"];

export const DEFAULT_OCR_KEEP: OcrKeepOption[] = OCR_KEEP_OPTIONS.map(({ value }) => value);

export const OCR_KEEP_MARKER = "USER KEEP PREFERENCES";
const OCR_KEEP_END = "END KEEP PREFERENCES";

function optionLabel(value: OcrKeepOption) {
  return OCR_KEEP_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function buildOcrKeepInstructions(keep: OcrKeepOption[]) {
  const selected = keep.length ? keep : DEFAULT_OCR_KEEP;
  const selectedLabels = selected.map(optionLabel).join(", ");
  const omittedLabels = OCR_KEEP_OPTIONS
    .filter(({ value }) => !selected.includes(value))
    .map(({ label }) => label)
    .join(", ");

  return `${OCR_KEEP_MARKER}
Keep and prioritize these content types in the final note: ${selectedLabels}.
Preserve their original wording, order, and visible structure. Do not omit selected content just because it is embedded in an image.${omittedLabels ? `
Do not spend output on these unselected content types: ${omittedLabels}.` : ""}\n${OCR_KEEP_END}`;
}

/** Replaces the selection section so the copied prompt always matches the UI. */
export function applyOcrKeepPreferences(prompt: string, keep: OcrKeepOption[]) {
  const start = prompt.indexOf(OCR_KEEP_MARKER);
  const end = prompt.indexOf(OCR_KEEP_END, start);
  if (start >= 0 && end >= 0) return prompt.slice(0, start) + buildOcrKeepInstructions(keep) + prompt.slice(end + OCR_KEEP_END.length);
  const basePrompt = prompt.split(OCR_KEEP_MARKER)[0].trimEnd();
  return `${basePrompt}\n\n${buildOcrKeepInstructions(keep)}`;
}
