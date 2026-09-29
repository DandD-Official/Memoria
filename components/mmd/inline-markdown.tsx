import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { remarkMmdMath } from "@/lib/mmd/math";
import { TableCellContent } from "@/components/markdown/table-cell";
import { Children, isValidElement, type ReactElement } from "react";
import { CodeBlock } from "@/components/mmd/blocks/code-block";
import { rehypeSourceLines } from "@/lib/mmd/source-map";

/**
 * Renders a run of ordinary Markdown. Used both for top-level content and
 * for the Markdown text nodes inside MMD block bodies. Deliberately does
 * NOT use rehype-raw (same reasoning as the original
 * components/markdown/renderer.tsx: raw HTML renders as literal text
 * rather than executing — this is the app's XSS defense for user/AI
 * content and MMD must not relax it).
 *
 * No wrapping element: nested usage relies on an ancestor already
 * carrying the `.memora-markdown` class (see components/mmd/renderer.tsx)
 * so the existing typography rules in app/globals.css apply via
 * descendant selectors regardless of nesting depth.
 */
export function InlineMarkdown({ content, startLine }: { content: string; startLine?: number }) {
  if (!content.trim()) return null;
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMmdMath]}
      rehypePlugins={startLine === undefined ? [] : [[rehypeSourceLines, { startLine }]]}
      components={{
        pre: ({ children, node }) => {
          const child = Children.toArray(children).find(isValidElement) as ReactElement<{ children?: string; className?: string }> | undefined;
          const source = String(child?.props.children ?? "").replace(/\n$/, "");
          const language = child?.props.className?.replace(/^language-/, "") || "text";
          const code = <CodeBlock node={{ type: "block", block: "code", attrs: { language }, raw: source, children: [{ type: "markdown", content: source }] }} />;
          return startLine === undefined ? code : <div data-source-line={node?.properties?.["data-source-line"] as number | undefined} data-source-end={node?.properties?.["data-source-end"] as number | undefined}>{code}</div>;
        },
        table: ({ children, node: _node, ...props }) => (
          <ResponsiveTable>
            <table {...props}>{children}</table>
          </ResponsiveTable>
        ),
        td: ({ children, node: _node, ...props }) => <td {...props}><TableCellContent>{children}</TableCellContent></td>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
