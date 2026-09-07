import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { parseMmd, isPlainMarkdown } from "@/lib/mmd/parser";
import { MmdNodeList } from "@/components/mmd/node-list";

/**
 * Renders Memoria Markdown (MMD) — see .context/mmd-spec.md. This is the
 * new home for what components/markdown/renderer.tsx used to do directly;
 * that file now just re-exports this one under its old name so every
 * existing import site (note-detail, reviewer-detail, guest flows, the
 * public collection viewer, the editor's preview pane) keeps working
 * unchanged.
 */
export function MmdRenderer({ content }: { content: string }) {
  if (isPlainMarkdown(content)) {
    // Fast path, and a deliberate safety net: documents with zero MMD
    // fences (100% of existing Notes/Reviewers today) render through
    // exactly the same code path as before MMD existed — byte-for-byte
    // the same react-markdown call — rather than going through the MMD
    // parser and back out again. Existing content cannot regress.
    return (
      <div className="memora-markdown">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    );
  }

  const doc = parseMmd(content);
  return (
    <div className="memora-markdown">
      <MmdNodeList nodes={doc.children} />
    </div>
  );
}
