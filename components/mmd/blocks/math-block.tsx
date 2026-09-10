import type { MmdBlockNode } from "@/lib/mmd/ast";
import { renderMathFormula } from "@/lib/mmd/math";

/** :::math{formula="\\rightarrow"} */
export function MathBlock({ node }: { node: MmdBlockNode }) {
  const formula = node.attrs.formula;
  const rendered = renderMathFormula(formula);
  return (
    <div className="my-4 overflow-x-auto rounded-lg border border-line bg-surface px-4 py-3 text-center" role="img" aria-label={`Math expression: ${formula}`}>
      <span className="font-mono text-lg text-ink" aria-hidden="true">{rendered}</span>
    </div>
  );
}
