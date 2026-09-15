"use client";

import type { MmdBlockNode } from "@/lib/mmd/ast";
import { sanitizeSvgMarkup } from "@/lib/svg/sanitize";
import { FullscreenView } from "@/components/ui/fullscreen-view";
import { useMmdRenderContext } from "@/components/mmd/render-context";

function svgSource(node: MmdBlockNode): string {
  return node.children
    .filter((child): child is { type: "markdown"; content: string } => child.type === "markdown")
    .map((child) => child.content)
    .join("\n");
}

/** :::svg{alt="..." caption="..." align="..." size="..."} */
export function SvgBlock({ node }: { node: MmdBlockNode }) {
  const { mode } = useMmdRenderContext();
  const markup = sanitizeSvgMarkup(svgSource(node));
  const { alt, caption } = node.attrs;

  if (!markup) {
    return (
      <figure className="my-4 rounded-lg border border-dashed border-line bg-ink/[0.02] p-6 text-center">
        <p className="text-sm font-medium text-ink-soft">SVG visual could not be rendered safely.</p>
        <p className="mt-1 text-xs text-ink-faint">Check that it is a self-contained SVG without scripts, event handlers, or embedded HTML.</p>
        {caption && <figcaption className="mt-2 text-xs text-ink-faint">{caption}</figcaption>}
      </figure>
    );
  }

  const visual = (
    <div
      role="img"
      aria-label={alt}
      data-export-asset="inline-svg"
      className="min-w-0 w-full max-w-full overflow-hidden rounded-lg border border-line bg-surface p-2 [&>svg]:mx-auto [&>svg]:block [&>svg]:h-auto [&>svg]:w-full [&>svg]:max-w-full"
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );

  if (mode === "export") {
    return (
      <figure data-export-block="svg" className="my-4 w-full max-w-full">
        {visual}
        {caption && <figcaption className="mt-1.5 text-center text-xs text-ink-soft">{caption}</figcaption>}
      </figure>
    );
  }

  return (
    <figure className="my-4 w-full max-w-full">
      <FullscreenView title={alt || "SVG visual"} description={caption || "Expanded SVG visual"} iconOnly>
        {visual}
      </FullscreenView>
      {caption && <figcaption className="mt-1.5 text-center text-xs text-ink-soft">{caption}</figcaption>}
    </figure>
  );
}
