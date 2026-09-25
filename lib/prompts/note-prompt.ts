import { buildMmdOutputRules } from "@/lib/mmd/ai-instructions";
import { visualStyleRules } from "@/lib/prompts/visual-quality";

export type ProcessingStyle = "preserve" | "balanced" | "condensed" | "exam_focused" | "visual_creative";

export const PROCESSING_STYLE_LABELS: Record<ProcessingStyle, string> = {
  preserve: "Preserve — keep almost everything, just improve structure",
  balanced: "Balanced — clean and organize, remove obvious redundancy",
  condensed: "Condensed — shorter reviewer, keep only what matters",
  exam_focused: "Exam Focused — prioritize concepts likely to be tested",
  visual_creative: "Visual & Creative - use high-value SVG visuals to make ideas memorable",
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
    "Create a visually rich, memorable reviewer. Keep all important source facts, but actively look for concepts that become clearer as a process flow, timeline, hierarchy, comparison, cycle, map, or labeled system. Add purposeful self-contained HTML/SVG visuals when the source supports them, using the supported :::svg block and concise explanatory text. Visuals should clarify the source rather than decorate it, and must never introduce facts as source-derived when they are not present in the source. Reliable explanatory additions must be explicitly labeled Additional context.",
};

const TOPIC_STYLE_INSTRUCTIONS: Record<ProcessingStyle, string> = {
  preserve: "Cover the topic comprehensively, including important background, terminology, mechanisms, examples, and practical implications.",
  balanced: "Give a clear, well-scoped explanation with the essential context, key ideas, examples, and a concise recap.",
  condensed: "Focus on the smallest set of ideas needed to understand and remember the topic. Avoid repetition and minor tangents.",
  exam_focused: "Prioritize definitions, distinctions, processes, facts, common misconceptions, and questions a learner may be tested on.",
  visual_creative: "Make the explanation memorable with purposeful visuals such as a process flow, timeline, hierarchy, comparison, cycle, or labeled system when one genuinely clarifies the topic.",
};

const STUDY_GUIDE_RULES = `STUDY GUIDE QUALITY
- Produce a self-contained study guide, not a thin outline. Begin with a short overview and learning goals, then teach concepts in prerequisite order.
- Explain what each major concept means, how or why it works, and how it connects to other ideas. Preserve important conditions, exceptions, units, and distinctions.
- Include worked examples with steps and reasoning when supported by the material. Compare easily confused ideas in tables and explain processes as numbered steps.
- Combine prose with Memoria's own :::definition, :::key-concept, :::example, :::warning, and :::summary elements where useful. Use :::columns with :::column children for short comparisons.
- End with a concise recap and retrieval questions with answers inside :::details blocks. Scale depth to the selected style and available material; do not pad short sources.
- For source-based work, ground explanations, examples, and answers in the supplied material. Preserve uncertainty and contradictions instead of inventing missing details.
- When additional information would make the guide clearer, add reliable prerequisite explanations or illustrative examples in a clearly labeled "Additional context" section. Keep them distinct from source claims. Never fabricate missing values, study results, or figure details; identify missing source information explicitly.
- Do not include citations, footnote references, source-number markers, bibliography, or a References section. Omit inherited citation markup while preserving substantive learning content. Never emit provider tokens such as [cite_start], [cite: ...], or filecite.
- Before returning, check coverage, factual fidelity, complete explanations, heading order, and correctly closed MMD blocks.`;

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
- You may add reliable background, prerequisite explanations, or illustrative examples when they improve understanding. Clearly label these additions "Additional context" and keep them separate from extracted source facts. Do not invent source-specific values, claims, quotations, or missing diagram details. If more source information is needed, mark what is missing instead of guessing.
- Do not remove information that is clearly important, even if it seems minor.
- If something in the source is unclear, illegible, or ambiguous, mark it as [UNCLEAR: ...] instead of guessing or inventing a replacement.
- Organize the content into logical topics using headings and subheadings.
- Make flashcard material machine-readable: write key definitions as "**Term**: definition" or place them in a two-column Term | Definition table, or as ":::definition{term=\"...\"}" blocks. This lets Memoria create flashcards automatically.

${STUDY_GUIDE_RULES}

${visualStyleRules(style)}

${buildMmdOutputRules()}

SOURCE MATERIAL
${sourceBlock}

Return the complete reformatted document as described above, using the outer-fence rule above.`;
}

/** Builds a prompt for creating a new note from a user-provided topic. */
export function buildTopicNotePrompt(topic: string, style: ProcessingStyle): string {
  return `You are creating a self-contained educational note about the topic below.

TOPIC
${topic.trim()}

TASK
Write a useful Memoria Markdown note that teaches this topic to a curious learner. ${TOPIC_STYLE_INSTRUCTIONS[style]}

RULES
- Start with exactly one top-level # heading that names the topic.
- Explain the core idea before adding detail, and use logical ## and ### headings.
- Define important terminology with "**Term**: definition" or :::definition{term="..."} blocks.
- Include concrete examples, comparisons, or step-by-step explanations when they improve understanding.
- Be accurate and honest. Do not invent citations, sources, data, quotations, or specific claims you cannot support.
- If the topic has multiple interpretations, state the interpretation you are using.
- Do not include an introduction or explanation outside the note.

${STUDY_GUIDE_RULES}

${visualStyleRules(style)}

${buildMmdOutputRules()}

Return the complete note using the outer-fence rule above.`;
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
    STUDY_GUIDE_RULES,
    visualStyleRules(style),
    buildMmdOutputRules(),
  ].join("\n");

  return `${header}\n${body}\n${instructions}\n`;
}
