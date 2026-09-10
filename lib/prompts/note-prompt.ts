import { buildMmdOutputRules } from "@/lib/mmd/ai-instructions";

export type ProcessingStyle = "preserve" | "balanced" | "condensed" | "exam_focused" | "visual_creative";

export const PROCESSING_STYLE_LABELS: Record<ProcessingStyle, string> = {
  preserve: "Preserve — keep almost everything, just improve structure",
  balanced: "Balanced — clean and organize, remove obvious redundancy",
  condensed: "Condensed — shorter reviewer, keep only what matters",
  exam_focused: "Exam Focused — prioritize concepts likely to be tested",
  visual_creative: "Visual & Creative - use high-value visuals to make ideas memorable",
};

const STYLE_INSTRUCTIONS: Record<ProcessingStyle, string> = {
  preserve:
    "Keep nearly all of the original information. Only fix formatting, structure, and organization. Do not shorten or remove content.",
  balanced:
    "Clean up and organize the material. You may remove obvious redundancy and filler, but keep every distinct fact, term, and idea.",
  condensed:
    "Produce a noticeably shorter reviewer. Keep only the information that is important to understand and remember; drop repetition and minor detail.",
  exam_focused:
    "Prioritize the concepts, definitions, and facts that are most likely to appear on a test. De-emphasize incidental detail that is unlikely to be assessed.",
  visual_creative:
    "Create a visually rich, memorable reviewer. Keep all important source facts, but actively look for concepts that become clearer as a process flow, timeline, hierarchy, comparison, cycle, map, or labeled system. Add several purposeful visuals throughout the document when the source supports them, using supported Memoria visual blocks and concise explanatory text. Prefer self-contained :::svg visuals for conceptual diagrams, and use :::image-request when a real or user-supplied image is genuinely needed. Visuals should clarify the source rather than decorate it, and must never introduce facts that are not present in the source.",
};

interface NoteForPrompt {
  title: string;
  content: string;
}

/**
 * Builds the "Prepare Notes for Memoria" prompt. The user pastes this
 * (or the downloaded source package) into Claude or another AI assistant;
 * Memoria can use a connected per-user AI key or a manual copy/paste workflow.
 *
 * Output is Memoria Markdown (MMD) — standard GitHub-flavored Markdown
 * plus the small set of fenced custom blocks defined in
 * .context/mmd-spec.md — wrapped in exactly one outer code fence. The
 * paste-back flow (components/reviewers/reviewer-wizard.tsx and the guest
 * equivalent) already strips that outer fence via stripCodeFences()
 * (lib/validation/reviewer.ts) while preserving any code fences that are
 * genuinely part of the document — see .context/ai-content-generation.md
 * for why the fence is required now rather than forbidden.
 */
export function buildNoteReformatPrompt(notes: NoteForPrompt[], style: ProcessingStyle): string {
  const sourceBlock = notes
    .map(
      (note, i) =>
        `--- SOURCE ${i + 1}: ${note.title} ---\n${note.content.trim()}\n--- END SOURCE ${i + 1} ---`
    )
    .join("\n\n");

  return `You are helping convert raw study notes into a clean, well-organized study reviewer.

TASK
Reformat the study material below into clean, organized Memoria Markdown. ${STYLE_INSTRUCTIONS[style]}

RULES
- Preserve all factual information: terminology, names, dates, numbers, and technical terms must stay accurate.
- Do not invent information that is not present in the source material.
- Do not remove information that is clearly important, even if it seems minor.
- If something in the source is unclear, illegible, or ambiguous, mark it as [UNCLEAR: ...] instead of guessing or inventing a replacement.
- Organize the content into logical topics using headings and subheadings.
- Make flashcard material machine-readable: write key definitions as "**Term**: definition" or place them in a two-column Term | Definition table, or as ":::definition{term=\"...\"}" blocks. This lets Memoria create flashcards automatically.

${buildMmdOutputRules()}

SOURCE MATERIAL
${sourceBlock}

Return the complete reformatted document as described above, using the outer-fence rule above.`;
}

/**
 * Builds the full exportable source package: readable note contents with
 * metadata and separators, followed by the AI instruction block. This is
 * what gets downloaded as memora-source.txt.
 */
export function buildSourcePackage(
  notes: (NoteForPrompt & { id: string; sourceType: string; updatedAt: Date })[],
  style: ProcessingStyle
): string {
  const header = `MEMORIA SOURCE PACKAGE\nGenerated ${new Date().toISOString()}\n${notes.length} note(s) included\n`;

  const body = notes
    .map((note, i) => {
      return [
        "==============================",
        `NOTE ${i + 1}: ${note.title}`,
        "==============================",
        `Source type: ${note.sourceType}`,
        `Last updated: ${note.updatedAt.toISOString()}`,
        "",
        note.content.trim(),
        "",
      ].join("\n");
    })
    .join("\n");

  const instructions = [
    "==============================",
    "MEMORIA AI INSTRUCTIONS",
    "==============================",
    `Convert the study material above into a clean Memoria Markdown reviewer.`,
    `Processing style: ${PROCESSING_STYLE_LABELS[style]}`,
    STYLE_INSTRUCTIONS[style],
    "",
    buildMmdOutputRules(),
  ].join("\n");

  return `${header}\n${body}\n${instructions}\n`;
}
