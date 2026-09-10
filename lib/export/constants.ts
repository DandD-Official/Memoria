export const EXPORT_PIXEL_RATIO = 2;
export const EXPORT_PAGE = {
  cssWidth: 794,
  cssHeight: 1123,
  margin: 48,
  footerHeight: 24,
  get contentWidth() { return this.cssWidth - this.margin * 2; },
  get contentHeight() { return this.cssHeight - this.margin * 2 - this.footerHeight; },
} as const;

export const EXPORT_COLORS = {
  paper: "#fafaf7",
} as const;
