interface PdfTextItem { str: string; transform: number[]; width?: number; hasEOL?: boolean }
export interface PdfPage {
  pageNumber: number;
  getTextContent(options: { normalizeWhitespace: boolean }): Promise<{ items: PdfTextItem[] }>;
  getOperatorList(): Promise<{ fnArray: number[] }>;
}

// pdf-parse's explicitly pinned v1.10.100 PDF.js operator IDs. Unlike scanning
// raw PDF bytes, operator lists include graphics in compressed object streams.
const VISUAL_OPERATORS = new Set([62, 66, 74, 83, 84, 85, 86, 87, 88, 89, 90, 91]);
export async function readPdfPage(page: PdfPage): Promise<{ text: string; hasVisuals: boolean }> {
  const text = await page.getTextContent({ normalizeWhitespace: false });
  let hasVisuals = false;
  try { hasVisuals = (await page.getOperatorList()).fnArray.some(op => VISUAL_OPERATORS.has(op)); }
  catch { hasVisuals = true; } // Be honest when visual completeness cannot be checked.
  let output = "";
  let previous: PdfTextItem | undefined;
  for (const item of text.items) {
    if (!item.str) continue;
    if (previous) {
      const newLine = previous.hasEOL || Math.abs(item.transform[5] - previous.transform[5]) > 2;
      const gap = item.transform[4] - previous.transform[4] - (previous.width ?? 0);
      output += newLine ? "\n" : gap > 1 && !output.endsWith(" ") ? " " : "";
    }
    output += item.str;
    previous = item;
  }
  return { text: `## Page ${page.pageNumber}\n\n${output.trim()}`, hasVisuals };
}
