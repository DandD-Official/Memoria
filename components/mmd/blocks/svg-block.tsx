import type { MmdBlockNode } from "@/lib/mmd/ast";
import { sanitizeSvgMarkup } from "@/lib/svg/sanitize";
import { cn } from "@/lib/utils";

const SIZE_CLASS: Record<string, string> = {
  small: "max-w-xs",
  medium: "max-w-2xl",
  large: "max-w-4xl",
  full: "max-w-full",
};

const ALIGN_CLASS: Record<string, string> = {
  left: "mr-auto",
  center: "mx-auto",
  right: "ml-auto",
};

function svgSource(node: MmdBlockNode): string {
  return node.children
    .filter((child): child is { type: "markdown"; content: string } => child.type === "markdown")
    .map((child) => child.content)
    .join("\n");
}

/** :::svg{alt="..." caption="..." align="..." size="..."} */
export function SvgBlock({ node }: { node: MmdBlockNode }) {
  const markup = sanitizeSvgMarkup(svgSource(node));
  const { alt, caption, align = "center", size = "large" } = node.attrs;

  if (!markup) {
    return (
      <figure className="my-4 rounded-lg border border-dashed border-line bg-ink/[0.02] p-6 text-center">
        <p className="text-sm font-medium text-ink-soft">SVG visual could not be rendered safely.</p>
        <p className="mt-1 text-xs text-ink-faint">Check that it is a self-contained SVG without scripts, event handlers, or embedded HTML.</p>
        {caption && <figcaption className="mt-2 text-xs text-ink-faint">{caption}</figcaption>}
      </figure>
    );
  }

  return (
    <figure className={cn("my-4", SIZE_CLASS[size] ?? SIZE_CLASS.large, ALIGN_CLASS[align] ?? ALIGN_CLASS.center)}>
      <div
        role="img"
        aria-label={alt}
        data-export-asset="inline-svg"
        className="overflow-hidden rounded-lg border border-line bg-surface p-2 [&>svg]:block [&>svg]:h-auto [&>svg]:w-full"
        dangerouslySetInnerHTML={{ __html: markup }}
      />
      {caption && <figcaption className="mt-1.5 text-center text-xs text-ink-soft">{caption}</figcaption>}
    </figure>
  );
}
