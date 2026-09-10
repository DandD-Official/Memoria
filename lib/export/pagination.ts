import { EXPORT_PAGE } from "@/lib/export/constants";
import type { CanonicalPage } from "@/lib/export/types";

interface MeasuredUnit {
  nodes: Element[];
  height: number;
}

function marginHeight(element: Element): number {
  const style = window.getComputedStyle(element);
  return parseFloat(style.marginTop || "0") + parseFloat(style.marginBottom || "0");
}

function isHeading(element: Element): boolean {
  return /^H[1-4]$/.test(element.tagName);
}

function measureUnits(markdown: HTMLElement): MeasuredUnit[] {
  const children = [...markdown.children];
  const units: MeasuredUnit[] = [];
  for (let index = 0; index < children.length; index += 1) {
    const element = children[index];
    const next = children[index + 1];
    const rect = element.getBoundingClientRect();
    const height = rect.height + marginHeight(element);
    if (isHeading(element) && next) {
      const nextRect = next.getBoundingClientRect();
      units.push({ nodes: [element, next], height: height + nextRect.height + marginHeight(next) });
      index += 1;
    } else {
      units.push({ nodes: [element], height });
    }
  }
  return units;
}

function pageElement(height = EXPORT_PAGE.cssHeight): HTMLElement {
  const page = document.createElement("div");
  page.className = "mmd-export-surface mmd-export-page";
  page.style.height = `${height}px`;
  page.dataset.exportSurface = "page";
  return page;
}

function addFooter(page: HTMLElement, title: string, current: number, total: number): void {
  const footer = document.createElement("div");
  footer.className = "mmd-export-footer";
  footer.innerHTML = `<span>Made with Memoria &nbsp;|&nbsp; ${escapeHtml(title)}</span><span>Page ${current} of ${total}</span>`;
  page.appendChild(footer);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[character] ?? character));
}

function appendFlowContent(page: HTMLElement, nodes: Element[], headerNodes: Element[] = []): void {
  const content = document.createElement("div");
  content.className = "mmd-export-page-content";
  for (const node of headerNodes) content.appendChild(node.cloneNode(true));
  const markdown = document.createElement("div");
  markdown.className = "memora-markdown";
  for (const node of nodes) markdown.appendChild(node.cloneNode(true));
  content.appendChild(markdown);
  page.appendChild(content);
}

function appendFirstPageHeader(flow: HTMLElement): Element[] {
  const header = flow.querySelector(":scope > .mmd-export-brand-header");
  const title = flow.querySelector(":scope > .mmd-export-document-title");
  const nodes: Element[] = [];
  if (header) nodes.push(header);
  if (title) nodes.push(title);
  return nodes;
}

function measuredHeaderHeight(flow: HTMLElement): number {
  return appendFirstPageHeader(flow).reduce((height, element) => {
    return height + element.getBoundingClientRect().height + marginHeight(element);
  }, 0);
}

/**
 * Builds independent A4-sized DOM pages from the already-rendered export
 * surface. It packs top-level visual units and keeps headings with the next
 * block; columns, cards, figures, tables, and other component DOM remain
 * intact because they are cloned as complete visual units.
 */
export function paginateMmdSurface(root: HTMLElement, title: string): CanonicalPage[] {
  const cover = root.querySelector<HTMLElement>(":scope > [data-export-cover]");
  const flow = root.querySelector<HTMLElement>(":scope > .mmd-export-flow");
  if (!flow) throw new Error("The MMD export surface did not render its document flow.");

  const markdown = flow.querySelector<HTMLElement>(":scope > .memora-markdown");
  if (!markdown) throw new Error("The MMD export surface did not render Markdown content.");

  const pages: CanonicalPage[] = [];
  if (cover) {
    const coverPage = pageElement();
    coverPage.classList.add("mmd-export-cover-page");
    coverPage.appendChild(cover.cloneNode(true));
    pages.push({ element: coverPage, width: EXPORT_PAGE.cssWidth, height: EXPORT_PAGE.cssHeight });
  }

  const units = measureUnits(markdown);
  const headerHeight = measuredHeaderHeight(flow) + 16;
  let page = pageElement();
  let bodyNodes: Element[] = [];
  let used = headerHeight;
  let pageHasContent = false;

  const finishPage = () => {
    if (!cover || pages.length > 0) {
      if (pages.length === 0) {
        appendFlowContent(page, bodyNodes, appendFirstPageHeader(flow));
      } else if (cover && pages.length === 1) {
        appendFlowContent(page, bodyNodes, appendFirstPageHeader(flow));
      } else {
        appendFlowContent(page, bodyNodes);
      }
      pages.push({ element: page, width: EXPORT_PAGE.cssWidth, height: Number.parseFloat(page.style.height) });
    }
    page = pageElement();
    bodyNodes = [];
    used = cover && pages.length === 1 ? headerHeight : 0;
    pageHasContent = false;
  };

  if (units.length === 0 && !cover) finishPage();
  for (const unit of units) {
    const available = EXPORT_PAGE.contentHeight;
    const wouldOverflow = pageHasContent && used + unit.height > available;
    if (wouldOverflow) finishPage();
    bodyNodes.push(...unit.nodes);
    used += unit.height;
    pageHasContent = true;
    if (unit.height > available) {
      page.style.height = `${Math.max(EXPORT_PAGE.cssHeight, used + EXPORT_PAGE.margin + EXPORT_PAGE.footerHeight)}px`;
      finishPage();
    }
  }
  if (pageHasContent || pages.length === 0 || (cover && pages.length === 1)) finishPage();

  const total = pages.length;
  pages.forEach((entry, index) => addFooter(entry.element, title, index + 1, total));
  return pages;
}
