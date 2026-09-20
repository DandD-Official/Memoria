import { INDENT_UNIT, readFence, scanMmd } from "@/lib/mmd/grammar";
import { BLOCK_DEFS } from "@/lib/mmd/spec-blocks";
import type { MmdChange } from "@/lib/mmd/diagnostics";

export function indentLines(source: string, from: number, to: number, outdent = false): MmdChange[] {
  const start = source.lastIndexOf("\n", Math.max(0, from - 1)) + 1;
  const changes: MmdChange[] = [];
  let at = start;
  for (const line of source.slice(start).split("\n")) {
    if (at > to || (at === to && to > from)) break;
    const marker = /^[ \t]*([-+*] |\d+[.)] |> )/.exec(line)?.[1];
    const width = marker?.length ?? INDENT_UNIT;
    const remove = line.startsWith("\t") ? 1 : Math.min(width, line.match(/^ */)![0].length);
    changes.push({ from: at, to: at + (outdent ? remove : 0), insert: outdent ? "" : " ".repeat(width) });
    at += line.length + 1;
  }
  return changes;
}
export function enterEdit(source: string, from: number, to = from): { changes: MmdChange; anchor: number } {
  const start = source.lastIndexOf("\n", from - 1) + 1;
  const before = source.slice(start, from);
  const indent = before.match(/^[ \t]*/)![0];
  const fence = readFence(before);
  let insert = `\n${indent}`;
  if (fence.kind === "open") {
    let depth = 1;
    for (const line of scanMmd(source.slice(to))) {
      if (line.kind === "open") depth++;
      if (line.kind === "close" && --depth === 0) break;
    }
    insert += " ".repeat(INDENT_UNIT);
    const anchor = from + insert.length;
    if (depth > 0) insert += `\n${indent}:::`;
    return { changes: { from, to, insert }, anchor };
  }
  const list = /^([ \t]*)([-+*]|\d+[.)]|>)( +)(.*)$/.exec(before);
  if (list) {
    if (!list[4]) return { changes: { from: start, to, insert: indent }, anchor: start + indent.length };
    const marker = /^\d/.test(list[2]) ? list[2].replace(/^\d+/, n => String(Number(n) + 1)) : list[2];
    insert += marker + list[3];
  }
  return { changes: { from, to, insert }, anchor: from + insert.length };
}
export function smartBackspace(source: string, at: number): MmdChange | undefined {
  const start = source.lastIndexOf("\n", at - 1) + 1;
  const before = source.slice(start, at);
  if (!before || !/^[ \t]+$/.test(before)) return;
  const count = before.endsWith("\t") ? 1 : ((before.length - 1) % INDENT_UNIT) + 1;
  return { from: at - count, to: at, insert: "" };
}
export function electricCloser(source: string, at: number): MmdChange | undefined {
  const start = source.lastIndexOf("\n", at - 1) + 1;
  if (readFence(source.slice(start, at)).kind !== "close") return;
  const stack: string[] = [];
  for (const line of scanMmd(source.slice(0, start))) {
    if (line.kind === "open") stack.push(line.indent);
    if (line.kind === "close") stack.pop();
  }
  if (stack.length) return { from: start, to: at, insert: `${stack.at(-1)}:::` };
}
export function templateEdit(source: string, from: number, to: number, insertion: string, block = false) {
  const start = source.lastIndexOf("\n", from - 1) + 1;
  const before = source.slice(start, from);
  const indent = before.match(/^[ \t]*/)![0];
  const prefix = block && before.trim() ? `\n${indent}` : "";
  const insert = prefix + insertion.replace(/\n(?=.)/g, `\n${indent}`);
  const placeholder = /"([^"]*)"|Write[^\n]*|Content[^\n]*/.exec(insert);
  const anchor = placeholder ? from + placeholder.index + (placeholder[1] !== undefined ? 1 : 0) : from + insert.length;
  const head = placeholder ? anchor + (placeholder[1] ?? placeholder[0]).length : anchor;
  return { changes: { from, to, insert }, selection: { anchor, head } };
}
export function enumValues(block: string, attr: string): string[] {
  const result = BLOCK_DEFS[block]?.attrs[attr]?.safeParse("__completion__");
  return result && !result.success ? result.error.issues.flatMap(issue => issue.code === "invalid_enum_value" ? issue.options.map(String) : []) : [];
}
export function blockCandidates() {
  return Object.values(BLOCK_DEFS).map(def => ({ label: def.name, detail: def.description, required: def.requiredAttrs }));
}
