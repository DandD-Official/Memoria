"use client";

import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import type { MmdBlockNode } from "@/lib/mmd/ast";
import { cn } from "@/lib/utils";
import { useMmdRenderContext } from "@/components/mmd/render-context";
import { mmdPresentationClass } from "@/components/mmd/style-utils";

/** :::section{title="..." subtitle="..."} — a titled section, structural
 * only (no border/background of its own) so nesting other blocks inside
 * doesn't create visual box-in-a-box clutter. */
export function SectionBlock({ node, children }: { node: MmdBlockNode; children: ReactNode }) {
  const { mode } = useMmdRenderContext();
  return (
    <section className={cn("my-8 border-s-2 border-accent/45 ps-5", mmdPresentationClass(node.attrs))}>
      <p className="eyebrow text-accent-dark">Section</p>
      <h2 style={mode === "export" ? { fontSize: 30 } : undefined} className="mt-1 font-display text-2xl font-medium text-ink sm:text-3xl">{node.attrs.title}</h2>
      {node.attrs.subtitle && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-soft">{node.attrs.subtitle}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

const CARD_VARIANTS: Record<string, string> = {
  default: "border-line bg-surface",
  outline: "border-line bg-transparent",
  highlight: "border-accent/40 bg-accent-soft/20",
};

/** :::card{title="..." subtitle="..." icon="..." type="default|outline|highlight"} */
export function CardBlock({ node, children }: { node: MmdBlockNode; children: ReactNode }) {
  const variant = CARD_VARIANTS[node.attrs.type ?? "default"] ?? CARD_VARIANTS.default;
  return (
    <article className={cn("my-5 rounded-card border p-5 shadow-sm", variant, mmdPresentationClass(node.attrs))}>
      {(node.attrs.title || node.attrs.subtitle) && (
        <div className="mb-3">
          {node.attrs.title && (
            <h4 className="font-display text-lg font-medium text-ink">
              {node.attrs.icon ? `${node.attrs.icon} ` : ""}
              {node.attrs.title}
            </h4>
          )}
          {node.attrs.subtitle && <p className="mt-0.5 text-sm text-ink-soft">{node.attrs.subtitle}</p>}
        </div>
      )}
      <div className="text-sm text-ink [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">{children}</div>
    </article>
  );
}

/** :::columns — must contain only :::column children (enforced by the
 * parser; an invalid mix never reaches this component, it becomes a
 * single mmd-error instead). `columnCount` picks the responsive grid so
 * 2 columns and 3 columns lay out differently rather than always
 * defaulting to a fixed count. */
export function ColumnsBlock({ node, children }: { node: MmdBlockNode; children: ReactNode }) {
  const { mode } = useMmdRenderContext();
  const count = node.children.filter((c) => c.type === "block").length;
  const gridClass = count >= 3 ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2";
  return <div data-export-block="columns" style={mode === "export" ? { gridTemplateColumns: `repeat(${count >= 3 ? 3 : 2}, minmax(0, 1fr))` } : undefined} className={cn("my-5 grid min-w-0 grid-cols-1 gap-4", gridClass)}>{children}</div>;
}

/** :::column — one column inside :::columns. */
export function ColumnBlock({ children }: { children: ReactNode }) {
  return <div data-export-block="column" className="min-w-0 rounded-card border border-line bg-surface-muted/45 p-4 [&>*:first-child]:mt-0">{children}</div>;
}

/** :::details{title="..."} — native <details>/<summary> for built-in
 * keyboard accessibility (Space/Enter toggles, no custom JS needed). */
export function DetailsBlock({ node, children }: { node: MmdBlockNode; children: ReactNode }) {
  const { mode } = useMmdRenderContext();
  return (
    <details data-export-block="details" open={mode === "export" ? true : undefined} className="group my-5 rounded-card border border-line bg-surface p-4 shadow-sm">
      <summary className="flex min-h-9 cursor-pointer list-none items-center gap-2 font-medium text-ink [&::-webkit-details-marker]:hidden">
        <ChevronRight
          className="h-4 w-4 shrink-0 text-ink-soft transition-transform group-open:rotate-90"
          aria-hidden="true"
        />
        {node.attrs.title || "Details"}
      </summary>
      <div className="mt-3 text-sm text-ink [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
        {children}
      </div>
    </details>
  );
}
