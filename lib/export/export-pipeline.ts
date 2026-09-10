import { renderCanonicalMmdDocument, type CanonicalExportOptions } from "@/lib/export/canonical";
import { captureCanonicalPages } from "@/lib/export/capture-page";
import type { CapturedPage } from "@/lib/export/types";

export async function renderAndCaptureMmdDocument(options: CanonicalExportOptions): Promise<CapturedPage[]> {
  const canonical = await renderCanonicalMmdDocument(options);
  try {
    return await captureCanonicalPages(canonical.pages, (current, total) => {
      options.onProgress?.({ phase: "capturing", current, total, message: `Rendering page ${current} of ${total}…` });
    });
  } finally {
    canonical.cleanup();
  }
}

export function dataUrlToBytes(dataUrl: string): Uint8Array {
  const separator = dataUrl.indexOf(",");
  if (separator < 0) throw new Error("Captured export page was not a valid data URL.");
  const encoded = dataUrl.slice(separator + 1);
  const binary = atob(encoded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
