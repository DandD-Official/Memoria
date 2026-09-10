"use client";

import type { CSSProperties } from "react";
import type { MmdBlockNode } from "@/lib/mmd/ast";
import { CODE_THEMES, type CodeTheme } from "@/lib/mmd/code-themes";
import { useCodeTheme } from "@/components/mmd/code-theme-context";
import { tokeniseCodeLine, type CodeTokenKind } from "@/lib/mmd/code-highlight";

function sourceText(node: MmdBlockNode): string {
  return node.children
    .filter((child): child is { type: "markdown"; content: string } => child.type === "markdown")
    .map((child) => child.content)
    .join("\n")
    .replace(/^\n/, "")
    .replace(/\n$/, "");
}

const TOKEN_COLOR: Record<CodeTokenKind, keyof CodeTheme> = {
  plain: "foreground",
  comment: "comment",
  string: "string",
  keyword: "keyword",
  number: "number",
  function: "function",
  type: "type",
  operator: "operator",
};

export function CodeBlock({ node }: { node: MmdBlockNode }) {
  const { codeTheme } = useCodeTheme();
  const theme = CODE_THEMES[node.attrs.theme as keyof typeof CODE_THEMES] ?? CODE_THEMES[codeTheme];
  const language = node.attrs.language || "text";
  const lines = sourceText(node).split("\n");
  const style = { "--mmd-code-bg": theme.background, "--mmd-code-fg": theme.foreground, "--mmd-code-gutter": theme.gutter } as CSSProperties;

  return (
    <figure className="mmd-code-block my-4 overflow-hidden rounded-lg" style={style} data-code-theme={node.attrs.theme ?? codeTheme}>
      {(node.attrs.title || node.attrs.language) && (
        <figcaption className="mmd-code-header">
          <span>{node.attrs.title || "Code"}</span>
          <span className="mmd-code-language">{language}</span>
        </figcaption>
      )}
      <pre className="mmd-code-pre" aria-label={`${language} code`}><code>
        {lines.map((line, index) => (
          <span className="mmd-code-line" key={`${index}-${line}`}>
            <span className="mmd-code-gutter" aria-hidden="true">{index + 1}</span>
            <span className="mmd-code-content">{tokeniseCodeLine(line, language).map((token, tokenIndex) => <span key={`${tokenIndex}-${token.value}`} style={{ color: theme[TOKEN_COLOR[token.kind]] }}>{token.value}</span>)}</span>
          </span>
        ))}
      </code></pre>
    </figure>
  );
}
