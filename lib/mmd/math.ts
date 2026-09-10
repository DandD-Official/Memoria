/** Small, dependency-free math renderer for the MMD math contract.
 * This intentionally covers common notation/symbols without executing or
 * injecting TeX. Unknown commands remain readable as plain text. */

const SYMBOLS: Record<string, string> = {
  alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ε", theta: "θ",
  lambda: "λ", mu: "μ", pi: "π", sigma: "σ", phi: "φ", omega: "ω",
  Gamma: "Γ", Delta: "Δ", Theta: "Θ", Lambda: "Λ", Pi: "Π", Sigma: "Σ",
  Phi: "Φ", Omega: "Ω", to: "→", rightarrow: "→", longrightarrow: "⟶",
  leftarrow: "←", longleftarrow: "⟵", leftrightarrow: "↔", Rightarrow: "⇒",
  Leftarrow: "⇐", Leftrightarrow: "⇔", mapsto: "↦", times: "×", cdot: "⋅",
  pm: "±", le: "≤", leq: "≤", ge: "≥", geq: "≥", neq: "≠", approx: "≈",
  in: "∈", notin: "∉", subset: "⊂", supset: "⊃", cup: "∪", cap: "∩",
  sum: "∑", prod: "∏", int: "∫", infty: "∞", degree: "°",
};

/** Converts a safe, plain LaTeX-style expression to readable Unicode text. */
export function renderMathFormula(formula: string): string {
  return formula
    .replace(/^\$|\$$/g, "")
    .replace(/\\([A-Za-z]+)/g, (_, command: string) => SYMBOLS[command] ?? command)
    .replace(/[{}]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function splitInlineMath(value: string): Array<{ value: string; math: boolean }> {
  const parts: Array<{ value: string; math: boolean }> = [];
  const pattern = /\$((?:\\.|[^$\\])+)\$/g;
  let cursor = 0;
  for (const match of value.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > cursor) parts.push({ value: value.slice(cursor, index), math: false });
    parts.push({ value: renderMathFormula(match[1]), math: true });
    cursor = index + match[0].length;
  }
  if (cursor < value.length) parts.push({ value: value.slice(cursor), math: false });
  return parts.length ? parts : [{ value, math: false }];
}

/** Remark plugin that turns `$...$` text into safe span elements while
 * preserving the surrounding Markdown structure. */
export function remarkMmdMath() {
  return (tree: unknown) => {
    function visit(node: unknown, parentType?: string): unknown[] {
      if (!node || typeof node !== "object") return [];
      const current = node as { type?: string; value?: string; children?: unknown[]; data?: Record<string, unknown> };
      if (current.type === "text" && typeof current.value === "string" && parentType !== "code" && parentType !== "inlineCode") {
        const parts = splitInlineMath(current.value);
        if (parts.some((part) => part.math)) {
          return parts.map((part) => part.math
            ? {
                type: "text",
                value: part.value,
                data: {
                  hName: "span",
                  hProperties: { className: ["mmd-inline-math"], "aria-label": `Math expression: ${part.value}` },
                },
              }
            : { type: "text", value: part.value });
        }
      }
      if (current.children) {
        current.children = current.children.flatMap((child) => visit(child, current.type));
      }
      return [node];
    }
    visit(tree);
  };
}
