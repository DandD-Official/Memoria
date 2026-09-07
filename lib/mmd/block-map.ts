export interface MmdBlockMapEntry {
  name: string;
  openLine: number;
  closeLine: number | null;
  depth: number;
}

const OPEN_RE = /^:::([a-z][a-z0-9-]*)\s*(?:\{.*\})?\s*$/;
const CLOSE_RE = /^:::\s*$/;

/** Builds a lightweight line-oriented map for editor navigation. It mirrors
 * the parser's LIFO fence matching but keeps source line numbers. */
export function mapMmdBlocks(source: string): MmdBlockMapEntry[] {
  const entries: MmdBlockMapEntry[] = [];
  const stack: MmdBlockMapEntry[] = [];
  source.replace(/\r\n/g, "\n").split("\n").forEach((line, index) => {
    const open = OPEN_RE.exec(line);
    if (open) {
      const entry: MmdBlockMapEntry = { name: open[1], openLine: index + 1, closeLine: null, depth: stack.length };
      entries.push(entry);
      stack.push(entry);
      return;
    }
    if (CLOSE_RE.test(line)) {
      const entry = stack.pop();
      if (entry) entry.closeLine = index + 1;
    }
  });
  return entries;
}
