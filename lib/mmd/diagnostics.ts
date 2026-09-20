import { scanMmd, type FenceLine } from "@/lib/mmd/grammar";
import { BLOCK_DEFS } from "@/lib/mmd/spec-blocks";
import { collectMmdErrors, parseMmd } from "@/lib/mmd/parser";
import { sanitizeSvgMarkup } from "@/lib/svg/sanitize";

export interface MmdChange { from: number; to: number; insert: string }
export interface MmdDiagnostic {
  severity: "error" | "warning" | "info"; code: string; message: string;
  from: number; to: number; line: number; col: number;
  relatedFrom?: number; relatedTo?: number;
  fixes?: { label: string; changes: MmdChange[] }[];
}
/** Bounded by the small spec vocabulary, independent of document length. */
export function nearestName(name: string, choices: string[]): string | undefined {
  let best: string | undefined; let score = Infinity;
  for (const choice of choices) {
    let row = Array.from({ length: choice.length + 1 }, (_, i) => i);
    for (let i = 0; i < Math.min(name.length, 100); i++) {
      const next = [i + 1];
      for (let j = 0; j < choice.length; j++) next.push(Math.min(next[j] + 1, row[j + 1] + 1, row[j] + Number(name[i] !== choice[j])));
      row = next;
    }
    if (row[choice.length] < score) { score = row[choice.length]; best = choice; }
  }
  return best;
}
export function analyzeMmd(source: string): MmdDiagnostic[] {
  const lines = scanMmd(source); const diagnostics: MmdDiagnostic[] = []; const stack: FenceLine[] = [];
  const eol = source.includes("\r\n") ? "\r\n" : "\n";
  const availableClosers: number[] = []; let remaining = 0;
  for (let i = lines.length - 1; i >= 0; i--) { availableClosers[i] = remaining; if (lines[i].kind === "close") remaining++; else if (lines[i].kind === "open") remaining = Math.max(0, remaining - 1); }
  const add = (line: FenceLine, code: string, severity: MmdDiagnostic["severity"], message: string, from = line.from + line.indent.length, to = line.to, changes?: MmdChange[], label = "Fix") => {
    const item: MmdDiagnostic = { code, severity, message, from, to, line: line.line, col: from - line.from + 1 };
    if (changes) item.fixes = [{ label, changes }];
    diagnostics.push(item); return item;
  };
  const unclosed = (open: FenceLine, at: number, expectedLine: number) => {
    const insert = `${at === source.length && !source.endsWith("\n") ? eol : ""}${open.indent}:::${at < source.length ? eol : ""}`;
    const item = add(open, "unclosed-block", "error", `Missing closing ::: for ${open.name}; expected before line ${expectedLine}.`, undefined, undefined, [{ from: at, to: at, insert }], "Insert closing :::");
    item.relatedFrom = at; item.relatedTo = at;
  };
  for (const line of lines) {
    if (line.kind === "malformed") { add(line, "malformed-fence", "error", 'Use :::name{key="value"} with double-quoted values.', undefined, undefined, line.canonical ? [{ from: line.from, to: line.to, insert: line.canonical + (availableClosers[line.line - 1] ? "" : `${eol}${line.indent}:::`) }] : undefined, "Rewrite fence"); continue; }
    if (line.kind === "close") {
      if (!stack.length) { add(line, "stray-closer", "warning", "This closing ::: has no opening block.", undefined, undefined, [{ from: line.from, to: Math.min(source.length, line.to + eol.length), insert: "" }], "Delete closing fence"); continue; }
      // Diagnostics use indentation only when it identifies an actual outer frame.
      if (stack[stack.length - 1].indent !== line.indent) {
        const outer = stack.map(open => open.indent).lastIndexOf(line.indent);
        if (outer >= 0) while (stack.length - 1 > outer) unclosed(stack.pop()!, line.from, line.line);
      }
      const open = stack.pop()!;
      const body = source.slice(open.to, line.from).trim();
      if ((open.name === "svg" || open.name === "code") && !body) add(open, "empty-body", "info", `The ${open.name} block has nothing to render.`);
      if (open.name === "svg" && body && sanitizeSvgMarkup(body) === null) add(open, "svg-unsafe", "warning", "SVG contains unsupported or unsafe markup and will not render.", open.from, line.to);
      continue;
    }
    if (line.kind !== "open") continue;
    stack.push(line);
    if (line.indent.includes(" ") && line.indent.includes("\t")) add(line, "mixed-indent", "info", "Use spaces consistently for fence indentation.", line.from, line.from + line.indent.length, [{ from: line.from, to: line.from + line.indent.length, insert: line.indent.replace(/\t/g, "  ") }], "Convert tabs to spaces");
    const def = BLOCK_DEFS[line.name];
    if (!def) {
      const suggestion = nearestName(line.name, Object.keys(BLOCK_DEFS))!;
      const from = line.from + line.indent.length + 3;
      add(line, "unknown-block", "error", `Unknown block ${line.name}. Did you mean :::${suggestion}?`, from, from + line.name.length, [{ from, to: from + line.name.length, insert: suggestion }], `Use ${suggestion}`); continue;
    }
    const seen = new Set<string>();
    for (const attr of line.attributes) {
      if (seen.has(attr.name)) add(line, "duplicate-attr", "warning", `Duplicate ${attr.name}; the last value wins.`, attr.nameFrom, attr.nameTo, [{ from: attr.from, to: attr.to, insert: "" }], "Remove duplicate");
      seen.add(attr.name);
      const schema = def.attrs[attr.name];
      if (!schema) {
        const suggestion = nearestName(attr.name, Object.keys(def.attrs));
        add(line, "unknown-attr", "warning", `Unknown attribute ${attr.name}.${suggestion ? ` Did you mean ${suggestion}?` : ""}`, attr.nameFrom, attr.nameTo, [{ from: attr.from, to: attr.to, insert: "" }], "Remove attribute");
      } else {
        const result = schema.safeParse(attr.value);
        if (!result.success) {
          const values = result.error.issues.flatMap(issue => issue.code === "invalid_enum_value" ? issue.options.map(String) : []);
          add(line, "invalid-attr-value", "warning", `${attr.name}: ${result.error.issues.map(issue => issue.message).join("; ")}`, attr.valueFrom, attr.valueTo, values.length ? [{ from: attr.valueFrom, to: attr.valueTo, insert: values[0] }] : undefined, values.length ? `Use ${values[0]}` : "Fix");
        }
      }
    }
    for (const name of def.requiredAttrs) {
      const attr = line.attributes.filter(item => item.name === name).at(-1);
      if (!attr || !def.attrs[name].safeParse(attr.value).success) {
        const end = line.from + (line.attrsRaw ? line.text.lastIndexOf("}") : line.text.trimEnd().length);
        add(line, "missing-attr", "error", `:::${line.name} requires a valid, nonempty ${name}.`, undefined, undefined, attr ? undefined : [{ from: end, to: end, insert: line.attrsRaw ? ` ${name}=""` : `{${name}=""}` }], `Add ${name}`);
      }
    }
  }
  while (stack.length) unclosed(stack.pop()!, source.length, lines.length + 1);
  // Policy errors come from the parser itself: no second copy of nesting rules.
  for (const error of collectMmdErrors(parseMmd(source))) {
    if (!error.position) continue;
    const line = lines[error.position.openLine - 1];
    if (error.reason.includes("nesting depth")) add(line, "nesting-depth", "error", error.reason);
    else if (/cannot contain|may only contain/.test(error.reason)) add(line, "bad-nesting", "error", error.reason);
  }
  return diagnostics.sort((a, b) => a.from - b.from);
}
export function savedMmdMessage(source: string): string {
  const errors = analyzeMmd(source).filter(item => item.severity === "error").length;
  return errors ? `Saved with ${errors} error${errors === 1 ? "" : "s"} — those blocks show as plain text` : "Saved";
}
