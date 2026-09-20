import { BLOCK_DEFS, type BlockDefinition } from "@/lib/mmd/spec-blocks";

const CATEGORY_ORDER: BlockDefinition["category"][] = ["code", "callout", "educational", "layout", "media", "ai"];

const CATEGORY_HEADINGS: Record<BlockDefinition["category"], string> = {
  code: "Code blocks",
  callout: "Callouts",
  educational: "Educational blocks",
  layout: "Layout",
  media: "Media",
  diagram: "Diagrams",
  ai: "Sanitized SVG visuals",
};

/** Illustrative examples used by tests and documentation. */
export const EXAMPLE_SYNTAX: Record<string, string> = {
  code: ':::code{language="typescript" title="Example"}\nconst answer = 42;\nconsole.log(answer);\n:::',
  note: ":::note\nUseful additional information.\n:::",
  tip: ":::tip\nA helpful shortcut or piece of advice.\n:::",
  warning: ':::warning{title="Exam Reminder"}\nSomething to be careful about.\n:::',
  danger: ":::danger\nCritical information.\n:::",
  info: ":::info\nGeneral supporting information.\n:::",
  success: ":::success\nA correct result.\n:::",
  definition: ':::definition{term="Normalization"}\nThe process of organizing data.\n:::',
  "key-concept": ":::key-concept\nA central idea.\n:::",
  example: ':::example{title="Example"}\nA worked example.\n:::',
  important: ":::important\nLikely to appear on an exam.\n:::",
  summary: ":::summary\nA short recap.\n:::",
  math: ':::math{formula="\\\\rightarrow"}\n:::',
  section: ':::section{title="Network Layer"}\nSection content.\n:::',
  card: ':::card{title="OSI Model"}\nCard content.\n:::',
  columns: ":::columns\n:::column\nLeft content.\n:::\n:::column\nRight content.\n:::\n:::",
  details: ':::details{title="Click to reveal"}\nSupplementary content.\n:::',
  image: ':::image{src="https://..." alt="Describe the image"}\n:::',
  gallery: ":::gallery\n![Router](https://...)\n![Switch](https://...)\n:::",
  diagram: ':::diagram{id="network-topology"}\n:::',
  "image-request": ':::image-request{purpose="Explain OSI layers" alt="Diagram of the seven OSI layers"}\n:::',
  svg: ':::svg{alt="A diagram of the OSI layers"}\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 360"><rect x="20" y="20" width="680" height="48" rx="8" fill="#fffaf0" stroke="#9b7653"/></svg>\n:::',
};

function describeAttrs(def: BlockDefinition): string {
  const attrs = Object.keys(def.attrs).map((name) => `${name} (${def.requiredAttrs.includes(name) ? "required" : "optional"})`);
  return attrs.length ? ` — attributes: ${attrs.join(", ")}` : "";
}

// Legacy blocks remain valid for existing notes but are intentionally absent
// from new AI instructions. The AI should produce self-contained SVG instead
// of a dangling saved-diagram reference or an image request.
const HIDDEN_FROM_REFERENCE = new Set(["column", "diagram", "image-request", "image", "gallery"]);

function buildBlockReference(): string {
  return CATEGORY_ORDER.map((category) => {
    const defs = Object.values(BLOCK_DEFS).filter((def) => def.category === category && !HIDDEN_FROM_REFERENCE.has(def.name));
    if (!defs.length) return "";
    return `${CATEGORY_HEADINGS[category]}:\n${defs.map((def) => {
      const example = EXAMPLE_SYNTAX[def.name];
      return `- :::${def.name}${describeAttrs(def)} — ${def.description}${example ? `\n  ${example.split("\n").join("\n  ")}` : ""}`;
    }).join("\n")}`;
  }).filter(Boolean).join("\n\n");
}

export function buildMmdOutputRules(): string {
  return `MEMORIA MARKDOWN OUTPUT RULES

Your output must use standard Markdown and the supported Memoria Markdown (MMD) extensions below.

Use normal Markdown for ordinary document structure. For source code, use the editable :::code block with a language attribute instead of a triple-backtick fence so Memoria can show line numbers, syntax colors, and preserved indentation.

Use a Memoria block only when it meaningfully improves organization, comprehension, or learning. Do not force every paragraph into a callout, card, or section.

Do not use raw HTML anywhere except inside a :::svg block. A :::svg body must contain only one self-contained SVG visual; it must not contain scripts, event-handler attributes, external URLs, stylesheets, foreignObject, or other embedded HTML. For mathematical notation, use :::math{formula="..."} or inline $...$ notation.

Do not invent block types that are not listed below.

Keep generated MMD opening and closing fences flush-left.
MMD block syntax: ":::blockname{attr=\"value\"}" on its own line, then content, then ":::" alone on its own line to close. Attribute values are always double-quoted.

SUPPORTED BLOCKS:

${buildBlockReference()}

Use a visual only when it would make the concept significantly easier to understand — never as decoration.

When a visual genuinely helps, generate one self-contained HTML/SVG visual using the supported :::svg{alt="..."} block. Put the complete sanitized SVG markup inside that block so Memoria can read and render it. Do not request, reference, or invent external images or saved diagrams. Never emit HTML outside the :::svg visual contract.

Maintain a logical heading hierarchy (one top-level "#" title, then "##"/"###" for structure). Give every image meaningful alt text.

Return the COMPLETE final document inside exactly ONE outer Markdown code fence (\`\`\`markdown ... \`\`\`). Do not include any explanation outside that code block. If the document contains any triple-backtick code snippet, use FOUR backticks for the outer wrapper so the inner snippet cannot close it. Use a matching-length closing fence.`;
}
