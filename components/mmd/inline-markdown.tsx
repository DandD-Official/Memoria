import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { remarkMmdMath } from "@/lib/mmd/math";
import { TableCellContent } from "@/components/markdown/table-cell";
import { Children, isValidElement, type ReactElement } from "react";
import { CodeBlock } from "@/components/mmd/blocks/code-block";

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
export function InlineMarkdown({ content }: { content: string }) {
  if (!content.trim()) return null;
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMmdMath]}
      components={{
        pre: ({ children }) => {
          const child = Children.toArray(children).find(isValidElement) as ReactElement<{ children?: string; className?: string }> | undefined;
          const source = String(child?.props.children ?? "").replace(/\n$/, "");
          const language = child?.props.className?.replace(/^language-/, "") || "text";
          return <CodeBlock node={{ type: "block", block: "code", attrs: { language }, raw: source, children: [{ type: "markdown", content: source }] }} />;
        },
        table: ({ children, ...props }) => (
          <ResponsiveTable>
            <table {...props}>{children}</table>
          </ResponsiveTable>
        ),
        td: ({ children, ...props }) => <td {...props}><TableCellContent>{children}</TableCellContent></td>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
