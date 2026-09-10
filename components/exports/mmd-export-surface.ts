"use client";

import { createElement, forwardRef } from "react";
import { MmdRenderer } from "@/components/mmd/renderer";
import { CodeThemeProvider } from "@/components/mmd/code-theme-context";
import type { MmdAssetRegistry } from "@/lib/export/asset-registry";
import { cn } from "@/lib/utils";

export interface MmdExportSurfaceProps {
  content: string;
  title?: string;
  bookCover?: { subtitle?: string | null; description?: string | null; author?: string | null };
  assetRegistry?: MmdAssetRegistry;
  className?: string;
}

const BRAND_LOGO_SVG = createElement(
  "svg",
  { viewBox: "0 0 64 64", "aria-hidden": true, focusable: false },
  createElement(
    "g",
    { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "4" },
    createElement("path", { d: "M22 14h27v38H23a8 8 0 0 1-8-8V22a8 8 0 0 1 7-7.94" }),
    createElement("path", { d: "M15 44a8 8 0 0 1 8-8h26" }),
    createElement("path", { d: "M29 14v15l6-5 6 5V14" })
  )
);

/**
 * The canonical visual root for document exports.
 *
 * It intentionally delegates all content rendering to MmdRenderer. Export
 * consumers should capture this resolved DOM rather than parsing MMD again or
 * maintaining another block-to-output mapping.
 */
export const MmdExportSurface = forwardRef<HTMLDivElement, MmdExportSurfaceProps>(function MmdExportSurface(
  { content, title, bookCover, assetRegistry, className },
  ref
) {
  const cover = bookCover
    ? createElement(
        "div",
        { "data-export-cover": true, className: "mmd-export-cover" },
        createElement("p", { className: "mmd-export-cover-eyebrow" }, "MEMORIA BOOK"),
        createElement("h1", null, title),
        bookCover.subtitle && createElement("p", { className: "mmd-export-cover-subtitle" }, bookCover.subtitle),
        bookCover.description && createElement("p", { className: "mmd-export-cover-description" }, bookCover.description),
        createElement("p", { className: "mmd-export-cover-author" }, `Curated by ${bookCover.author?.trim() || "a Memoria reader"}`),
        createElement("p", { className: "mmd-export-cover-mark" }, "Made with Memoria")
      )
    : null;

  const header = createElement(
    "header",
    { className: "mmd-export-brand-header" },
    createElement("span", { className: "mmd-export-brand-mark" }, BRAND_LOGO_SVG),
    createElement(
      "span",
      null,
      createElement("strong", null, "Memoria"),
      createElement("small", null, "Turn scattered notes into structured knowledge.")
    )
  );

  const flow = createElement(
    "div",
    { className: "mmd-export-flow" },
    header,
    title && createElement("h1", { className: "mmd-export-document-title" }, title),
    createElement(CodeThemeProvider, null, createElement(MmdRenderer, { content, mode: "export", assetRegistry }))
  );

  return createElement(
    "div",
    { ref, className: cn("mmd-export-surface", className), "data-export-surface": "mmd", "data-render-mode": "export" },
    cover,
    flow
  );
});
