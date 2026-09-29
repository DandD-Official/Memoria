interface SourceElement {
  type: string;
  tagName?: string;
  position?: { start: { line: number }; end: { line: number } };
  properties?: Record<string, unknown>;
  children?: SourceElement[];
}

const landmarks = new Set(["h1", "h2", "h3", "h4", "h5", "h6", "p", "li", "pre", "table", "tr", "blockquote", "hr"]);

/** Preserve Markdown's original line numbers through the rendered HTML tree. */
export function rehypeSourceLines({ startLine = 1 }: { startLine?: number } = {}) {
  return (tree: SourceElement) => {
    function visit(node: SourceElement) {
      if (node.type === "element" && landmarks.has(node.tagName ?? "") && node.position) {
        node.properties = { ...node.properties,
          "data-source-line": startLine + node.position.start.line - 1,
          "data-source-end": startLine + node.position.end.line - 1,
        };
      }
      node.children?.forEach(visit);
    }
    visit(tree);
  };
}
