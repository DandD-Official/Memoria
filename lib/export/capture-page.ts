import { toPng } from "html-to-image";
import { EXPORT_COLORS, EXPORT_PIXEL_RATIO } from "@/lib/export/constants";
import type { CapturedPage, CanonicalPage } from "@/lib/export/types";

export async function captureCanonicalPage(page: CanonicalPage): Promise<CapturedPage> {
  const dataUrl = await toPng(page.element, {
    backgroundColor: EXPORT_COLORS.paper,
    cacheBust: false,
    pixelRatio: EXPORT_PIXEL_RATIO,
    skipAutoScale: true,
  });
  return { ...page, dataUrl };
}

export async function captureCanonicalPages(
  pages: CanonicalPage[],
  onPage?: (current: number, total: number) => void
): Promise<CapturedPage[]> {
  const captured: CapturedPage[] = [];
  for (const [index, page] of pages.entries()) {
    onPage?.(index + 1, pages.length);
    captured.push(await captureCanonicalPage(page));
  }
  return captured;
}
