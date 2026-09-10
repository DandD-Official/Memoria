import { BLOCK_DEFS, type BlockDefinition } from "@/lib/mmd/spec-blocks";

/**
 * Generates the MMD portion of AI prompts from lib/mmd/spec-blocks.ts —
 * the single source of truth for the block list, so the parser and the
 * AI's instructions cannot silently drift apart (see
 * .context/ai-content-generation.md). Anywhere Memoria asks an AI
 * (connected provider or manual copy/paste) to produce Note/Reviewer
 * content should call buildMmdOutputRules() rather than hand-writing its
 * own formatting rules — see lib/prompts/note-prompt.ts for the current
 * caller.
 *
 * Deliberately NOT used by lib/prompts/quiz-prompt.ts — quizzes are a
 * separate JSON contract, not Markdown/MMD (see .context/content-system.md).
 */

const CATEGORY_ORDER: BlockDefinition["category"][] = [
  "callout",
  "educational",
  "layout",
  "media",
  "diagram",
  "ai",
];

const CATEGORY_HEADINGS: Record<BlockDefinition["category"], string> = {
  callout: "Callouts",
  educational: "Educational blocks",
  layout: "Layout",
  media: "Media",
  diagram: "Diagrams",
  ai: "AI visuals and pending image placeholders",
};

/** One example syntax line per block, used in the reference list below
 * the rules. Kept here (not spec-blocks.ts) since these are illustrative
 * placeholder VALUES for prompt copy, not schema — the attribute NAMES
 * and required-ness still come from BLOCK_DEFS, so the two can't drift
 * on what attributes exist, only on the example wording. */
export const EXAMPLE_SYNTAX: Record<string, string> = {
  note: ':::note\nUseful additional information.\n:::',
  tip: ':::tip\nA helpful shortcut or piece of advice.\n:::',
  warning: ':::warning{title="Exam Reminder"}\nSomething the reader should be careful about.\n:::',
  danger: ':::danger\nCritical — mistakes here have serious consequences.\n:::',
  info: ':::info\nGeneral supporting information.\n:::',
  success: ':::success\nA correct result or completed step.\n:::',
  definition: ':::definition{term="Normalization"}\nThe process of organizing data to reduce redundancy.\n:::',
  "key-concept": ':::key-concept\nThe Network Layer delivers packets between networks.\n:::',
  example: ':::example{title="Example"}\nA worked example illustrating the concept.\n:::',
  important: ':::important\nSomething likely to appear on an exam.\n:::',
  summary: ':::summary\nA short recap of this section.\n:::',
  math: ':::math{formula="\\\\rightarrow"}\n:::',
  section: ':::section{title="Network Layer" subtitle="Delivery and Routing"}\n...content, including other blocks...\n:::',
  card: ':::card{title="OSI Model"}\n...content...\n:::',
  columns: ':::columns\n:::column\nLeft content.\n:::\n:::column\nRight content.\n:::\n:::',
  details: ':::details{title="Click to reveal"}\nHidden supplementary content.\n:::',
  image: ':::image{src="https://..." alt="Describe the image" caption="Figure 1"}\n:::',
  gallery: ':::gallery\n![Router](https://...)\n![Switch](https://...)\n:::',
  diagram: ':::diagram{id="network-topology" caption="Basic Network Topology"}\n:::',
  "image-request": ':::image-request{purpose="Explain OSI layers" alt="Diagram of the seven OSI layers" caption="Figure 1"}\n:::',
  svg: ':::svg{alt="A diagram of the seven OSI layers" caption="OSI model"}\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 360">\n  <rect x="20" y="20" width="680" height="48" rx="8" fill="#fffaf0" stroke="#9b7653"/>\n  <text x="360" y="50" text-anchor="middle" font-family="Arial" font-size="20">Application</text>\n</svg>\n:::',
};

function describeAttrs(def: BlockDefinition): string {
  const parts = Object.keys(def.attrs).map((name) =>
    def.requiredAttrs.includes(name) ? `${name} (required)` : `${name} (optional)`
  );
  return parts.length > 0 ? ` — attributes: ${parts.join(", ")}` : "";
}

/** "column" only ever appears nested inside "columns" — same reasoning
 * as HIDDEN_FROM_MENU in components/mmd/editor/insert-menu.tsx. Listing
 * it as its own top-level bullet would invite an AI to emit a standalone
 * :::column outside any :::columns, which parses but is meaningless. The
 * "columns" example already shows :::column children. */
const HIDDEN_FROM_REFERENCE = new Set(["column"]);

function buildBlockReference(): string {
  const sections: string[] = [];
  for (const category of CATEGORY_ORDER) {
    const defs = Object.values(BLOCK_DEFS).filter(
      (d) => d.category === category && !HIDDEN_FROM_REFERENCE.has(d.name)
    );
    if (defs.length === 0) continue;
    const lines = defs.map((def) => {
      const example = EXAMPLE_SYNTAX[def.name];
      return `- :::${def.name}${describeAttrs(def)} — ${def.description}${example ? `\n  ${example.split("\n").join("\n  ")}` : ""}`;
    });
    sections.push(`${CATEGORY_HEADINGS[category]}:\n${lines.join("\n")}`);
  }
  return sections.join("\n\n");
}

/**
 * The full MMD instruction block, per the project brief's "REQUIRED AI
 * PROMPT TEMPLATE" section. Callers embed this verbatim (or append their
 * own task-specific rules around it) rather than writing their own list
 * of supported syntax.
 */
export function buildMmdOutputRules(): string {
  return `MEMORIA MARKDOWN OUTPUT RULES

Your output must use standard Markdown and the supported Memoria Markdown (MMD) extensions below.

Use normal Markdown ("# Heading", "**bold**", "- item", tables, etc.) for ordinary document structure.

Use a Memoria Markdown block ONLY when it meaningfully improves organization, comprehension, or learning. A normal, well-structured Markdown document is a perfectly good result — do not force every paragraph into a callout, card, or section just because these blocks exist.

Do not use raw HTML anywhere except inside a :::svg block. A :::svg body must contain only one self-contained SVG visual; it must not contain scripts, event-handler attributes, external URLs, styles, foreignObject, or other embedded HTML. For mathematical notation, use :::math{formula="..."} or inline $...$ notation; do not use raw HTML for equations.

Do not invent block types that aren't listed below — an unrecognized block type will be shown to the reader as a visible error rather than rendered.

MMD block syntax: ":::blockname{attr=\"value\"}" on its own line, then content, then ":::" alone on its own line to close. Attribute values are always double-quoted.

SUPPORTED BLOCKS:

${buildBlockReference()}

Use an image or diagram only when it would make the concept SIGNIFICANTLY easier to understand (architecture, process flow, system components, hierarchy, relationships) — never as decoration, and never for something a short paragraph or list already explains well.

Memoria supports four visual paths: reference an existing saved diagram with ":::diagram{id=\"...\"}", emit a self-contained AI-generated visual with ":::svg{alt=\"...\"}" and SVG markup in its body, reference a real uploaded/external SVG or raster asset with ":::image{src=\"...\" alt=\"...\"}", or mark a needed visual for the user to supply with ":::image-request{purpose=\"...\" alt=\"...\"}". Use :::svg for deterministic conceptual visuals such as process flows, timelines, hierarchies, and comparisons. Use image-request when the visual needs a supplied asset or cannot be represented safely as SVG. Never invent a fake image URL or emit HTML outside the :::svg visual contract.

Maintain a logical heading hierarchy (one top-level "#" title, then "##"/"###" for structure).

Give every image meaningful alt text.

Return the COMPLETE final document inside exactly ONE outer Markdown code fence (\`\`\`markdown ... \`\`\`). Do not include any explanation, introduction, or commentary outside that code block. IMPORTANT: if the document contains any triple-backtick code snippet, use FOUR backticks for the outer wrapper (\`\`\`\`markdown ... \`\`\`\`) so the inner snippet cannot close the outer fence. Use a matching-length closing fence. Memoria accepts outer fences of 3 or more backticks and strips only the matching outer pair.`;
}
