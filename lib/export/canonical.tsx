import { createRoot, type Root } from "react-dom/client";
import { createElement } from "react";
import { MmdExportSurface } from "@/components/exports/mmd-export-surface";
import { createMmdAssetRegistry } from "@/lib/export/asset-registry";
import { prepareMmdForExport } from "@/lib/export/prepare-export";
import { paginateMmdSurface } from "@/lib/export/pagination";
import type { CanonicalPage, ExportProgressHandler } from "@/lib/export/types";

export interface CanonicalExportOptions {
  title: string;
  markdown: string;
  bookCover?: { subtitle?: string | null; description?: string | null; author?: string | null };
  onProgress?: ExportProgressHandler;
}

export interface CanonicalExportDocument {
  pages: CanonicalPage[];
  cleanup: () => void;
}

function nextFrames(count: number): Promise<void> {
  if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") return Promise.resolve();
  return new Promise((resolve) => {
    let remaining = count;
    const tick = () => {
      remaining -= 1;
      if (remaining <= 0) resolve();
      else window.requestAnimationFrame(tick);
    };
    window.requestAnimationFrame(tick);
  });
}

function removeExportHost(host: HTMLElement, reactRoot: Root): void {
  reactRoot.unmount();
  host.remove();
}

export async function renderCanonicalMmdDocument(options: CanonicalExportOptions): Promise<CanonicalExportDocument> {
  if (typeof document === "undefined") throw new Error("MMD document export is only available in a browser.");

  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.position = "fixed";
  host.style.top = "0";
  host.style.left = "-100000px";
  host.style.pointerEvents = "none";
  host.style.zIndex = "-1";
  document.body.appendChild(host);

  const reactRoot = createRoot(host);
  const assetRegistry = createMmdAssetRegistry();
  let preparedCleanup = () => {};
  try {
    options.onProgress?.({ phase: "preparing", message: "Preparing document…" });
    reactRoot.render(createElement(MmdExportSurface, {
      content: options.markdown,
      title: options.title,
      bookCover: options.bookCover,
      assetRegistry,
    }));
    await nextFrames(2);
    const surface = host.querySelector<HTMLElement>('[data-export-surface="mmd"]');
    if (!surface) throw new Error("The MMD export surface could not be rendered.");

    const prepared = await prepareMmdForExport(surface, { assetRegistry });
    preparedCleanup = prepared.cleanup;
    if (prepared.failedAssets.length > 0) {
      throw new Error(`Could not export because ${prepared.failedAssets.length} document asset${prepared.failedAssets.length === 1 ? "" : "s"} failed to resolve.`);
    }

    await nextFrames(1);
    const pages = paginateMmdSurface(surface, options.title);
    return {
      pages,
      cleanup: () => {
        preparedCleanup();
        removeExportHost(host, reactRoot);
      },
    };
  } catch (error) {
    preparedCleanup();
    removeExportHost(host, reactRoot);
    throw error;
  }
}
