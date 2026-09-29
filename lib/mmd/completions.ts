import { snippetCompletion, type CompletionContext, type Completion } from "@codemirror/autocomplete";
import { BLOCK_DEFS } from "@/lib/mmd/spec-blocks";
import { enumValues, blockCandidates } from "@/lib/mmd/editor-commands";

const markdown = [
  snippetCompletion("# ${Heading}", { label: "heading", detail: "Section heading", type: "keyword" }),
  snippetCompletion("**${text}**", { label: "bold", detail: "Strong emphasis", type: "keyword" }),
  snippetCompletion("[${text}](${https://example.com})", { label: "link", detail: "Link with a label", type: "keyword" }),
  snippetCompletion("- [ ] ${task}", { label: "task", detail: "Checklist item", type: "keyword" }),
  snippetCompletion("| ${Heading} | ${Heading} |\n| --- | --- |\n| ${Value} | ${Value} |", { label: "table", detail: "Two-column table", type: "keyword" }),
  snippetCompletion("```\${language}\n\${code}\n```", { label: "code", detail: "Fenced code block", type: "keyword" }),
];

function blocks(prefix = "") {
  return blockCandidates().map(item => snippetCompletion(`${prefix}${item.label}${item.required.length ? `{${item.required.map(attr => `${attr}="\${${attr}}"`).join(" ")}}` : ""}\n  \${body}\n:::`, {
    label: `${prefix}${item.label}`, detail: item.detail, info: `${item.detail}${item.required.length ? ` Required: ${item.required.join(", ")}.` : ""} Tab moves between fields.`, type: "type",
  }));
}

/** Completion ranges never consume the surrounding fence, brace or quote. */
export async function completeMmd(context: CompletionContext) {
  const line = context.state.doc.lineAt(context.pos);
  const before = line.text.slice(0, context.pos - line.from);
  const block = /^[ \t]*(:{2,3})([\w-]*)$/.exec(before);
  if (block) return { from: context.pos - block[2].length, options: blocks(block[1].length === 2 ? ":" : ""), validFor: /^[\w-]*$/ };
  const opener = /^[ \t]*:::([\w-]+)\{[^}]*$/.exec(before);
  if (!opener) {
    if (!context.explicit) return null;
    const word = context.matchBefore(/[\w-]*/);
    return { from: word?.from ?? context.pos, options: [...markdown, ...blocks(":::")], validFor: /^[\w:-]*$/ };
  }
  const value = /([\w-]+)="([^"\n]*)$/.exec(before);
  if (value) {
    let options: Completion[] = enumValues(opener[1], value[1]).map(label => ({ label, type: "enum" }));
    if (opener[1] === "diagram" && value[1] === "id") {
      try {
        const response = await fetch("/api/diagrams", { signal: AbortSignal.timeout(5000) });
        if (context.aborted) return null;
        if (response.ok) {
          const data = await response.json();
          options = (Array.isArray(data) ? data : data.diagrams ?? []).map((diagram: { id: string; title: string }) => ({ label: diagram.id, displayLabel: diagram.title, type: "enum" }));
        }
      } catch { /* Local completions remain available offline. */ }
    }
    return { from: context.pos - value[2].length, options, validFor: /^[^"\n]*$/ };
  }
  // An equals sign or a closed quote is not an attribute name.
  if (!/[\s{][\w-]*$/.test(before)) return null;
  const word = before.match(/[\w-]*$/)![0];
  const used = new Set(Array.from(before.matchAll(/([\w-]+)\s*=/g), match => match[1]));
  const definition = BLOCK_DEFS[opener[1]];
  return { from: context.pos - word.length, validFor: /^[\w-]*$/, options: Object.keys(definition?.attrs ?? {}).filter(label => !used.has(label)).map(label => snippetCompletion(`${label}="\${value}"`, {
    label, type: "property", detail: definition.requiredAttrs.includes(label) ? "Required attribute" : "Optional attribute", info: enumValues(opener[1], label).join(" · ") || `Set ${label} for this ${opener[1]} block.`,
  })) };
}
