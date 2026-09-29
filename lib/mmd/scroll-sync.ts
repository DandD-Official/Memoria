export interface ScrollAnchor { source: number; preview: number }

/** Columns, hidden details and duplicate parent/child landmarks must not reverse scrolling. */
export function normalizeScrollAnchors(anchors: ScrollAnchor[], sourceMax: number, previewMax: number): ScrollAnchor[] {
  const result: ScrollAnchor[] = [{ source: 0, preview: 0 }];
  for (const anchor of [...anchors].sort((a, b) => a.source - b.source || a.preview - b.preview)) {
    const last = result[result.length - 1];
    if (anchor.source > last.source && anchor.preview > last.preview && anchor.source < sourceMax && anchor.preview < previewMax) result.push(anchor);
  }
  result.push({ source: Math.max(0, sourceMax), preview: Math.max(0, previewMax) });
  return result;
}

export function mapScrollOffset(anchors: ScrollAnchor[], offset: number, from: keyof ScrollAnchor): number {
  const to = from === "source" ? "preview" : "source";
  if (offset <= 0 || anchors.length < 2) return 0;
  for (let i = 1; i < anchors.length; i++) {
    const a = anchors[i - 1], b = anchors[i];
    if (offset <= b[from]) {
      const fraction = (offset - a[from]) / Math.max(1, b[from] - a[from]);
      return a[to] + fraction * (b[to] - a[to]);
    }
  }
  return anchors[anchors.length - 1][to];
}
