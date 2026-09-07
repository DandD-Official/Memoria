import { AlertTriangle, Info, Sparkles, Quote } from "lucide-react";
import { ResponsiveTable } from "@/components/ui/responsive-table";

type Block = { type: string; [key: string]: unknown };
type Section = { heading: string; content: Block[] };

const calloutStyles: Record<string, { icon: typeof Info; classes: string }> = {
  note: { icon: Info, classes: "border-line bg-ink/5 text-ink" },
  warning: { icon: AlertTriangle, classes: "border-danger/30 bg-danger/5 text-danger" },
  important: { icon: Sparkles, classes: "border-accent/40 bg-accent-soft text-accent-dark" },
};

function Block({ block }: { block: Block }) {
  switch (block.type) {
    case "paragraph":
      return <p className="leading-relaxed text-ink">{String(block.text)}</p>;
    case "bullet_list":
      return (
        <ul className="list-disc space-y-1 pl-5 text-ink">
          {(block.items as string[]).map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      );
    case "numbered_list":
      return (
        <ol className="list-decimal space-y-1 pl-5 text-ink">
          {(block.items as string[]).map((item, i) => <li key={i}>{item}</li>)}
        </ol>
      );
    case "table": {
      const headers = block.headers as string[];
      const rows = block.rows as string[][];
      return (
        <ResponsiveTable>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {headers.map((h, i) => (
                  <th key={i} className="border border-line bg-ink/5 px-3 py-2 text-left font-medium text-ink">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => <td key={j} className="border border-line px-3 py-2 text-ink-soft">{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </ResponsiveTable>
      );
    }
    case "definition":
      return (
        <div className="rounded-lg border-l-4 border-accent bg-accent-soft/40 px-4 py-2.5">
          <p className="font-medium text-ink">{String(block.term)}</p>
          <p className="text-sm text-ink-soft">{String(block.definition)}</p>
        </div>
      );
    case "formula":
      return (
        <div className="rounded-lg bg-ink/5 px-4 py-2.5 font-mono text-sm text-ink">
          {block.label ? <span className="mr-2 font-sans text-ink-soft">{String(block.label)}:</span> : null}
          {String(block.expression)}
        </div>
      );
    case "callout": {
      const style = calloutStyles[String(block.style)] ?? calloutStyles.note;
      const Icon = style.icon;
      return (
        <div className={`flex items-start gap-2 rounded-lg border px-4 py-2.5 text-sm ${style.classes}`}>
          <Icon className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{String(block.text)}</span>
        </div>
      );
    }
    case "quote":
      return (
        <blockquote className="flex items-start gap-2 border-l-4 border-line pl-4 italic text-ink-soft">
          <Quote className="mt-1 h-3.5 w-3.5 shrink-0" />
          <span>{String(block.text)}{block.attribution ? <span className="not-italic text-ink-faint"> — {String(block.attribution)}</span> : null}</span>
        </blockquote>
      );
    case "important_concept":
      return (
        <div className="rounded-card border border-accent/30 bg-accent-soft/40 p-4">
          <p className="mb-1 font-display text-sm text-accent-dark">{String(block.title)}</p>
          <p className="text-sm text-ink">{String(block.text)}</p>
        </div>
      );
    case "code":
      return <pre className="overflow-x-auto rounded-lg bg-[#1B1F3B] p-4 text-xs text-white"><code>{String(block.code)}</code></pre>;
    default:
      return null;
  }
}

export type { Block, Section };

export function ReviewerContent({ sections }: { sections: Section[] }) {
  return (
    <div className="space-y-8">
      {sections.map((section, i) => (
        <section key={i}>
          <h2 className="mb-3 font-display text-xl text-ink">{section.heading}</h2>
          <div className="space-y-3">
            {section.content.map((block, j) => <Block key={j} block={block} />)}
          </div>
        </section>
      ))}
    </div>
  );
}
