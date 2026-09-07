import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ResponsiveTable } from "@/components/ui/responsive-table";

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
      remarkPlugins={[remarkGfm]}
      components={{
        table: ({ children, ...props }) => (
          <ResponsiveTable>
            <table {...props}>{children}</table>
          </ResponsiveTable>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
