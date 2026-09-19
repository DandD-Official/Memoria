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

/** Split common flowing content before packing pages. Range cloning retains
 * inline emphasis and links when a paragraph spans several pages. */
function splitLargeElement(element: Element, markdown: HTMLElement): Element[] {
  const max = EXPORT_PAGE.contentHeight - 32;
  const measure = (node: Element) => {
    markdown.append(node); const height = node.getBoundingClientRect().height + marginHeight(node); node.remove(); return height;
  };
  if (element.getBoundingClientRect().height + marginHeight(element) <= max) return [element];
  const parts: Element[] = [];
  if (element.tagName === "P" && element.textContent && !element.querySelector("img,svg")) {
    const texts: Text[] = []; const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) texts.push(walker.currentNode as Text);
    const full = element.textContent;
    const boundaries = [0, ...[...full.matchAll(/\S+\s*/g)].map(match => match.index! + match[0].length)];
    if (boundaries.at(-1) !== full.length) boundaries.push(full.length);
    const locate = (offset: number): [Text, number] => {
      let position = offset;
      for (const text of texts) { if (position <= text.length) return [text, position]; position -= text.length; }
      return [texts[texts.length - 1], texts[texts.length - 1].length];
    };
    const fragment = (start: number, end: number) => {
      const range = document.createRange(); range.setStart(...locate(start)); range.setEnd(...locate(end));
      const copy = element.cloneNode(false) as Element; copy.append(range.cloneContents()); return copy;
    };
    let start = 0;
    while (start < boundaries.length - 1) {
      let low = start + 1, high = boundaries.length - 1, best = low;
      while (low <= high) {
        const middle = Math.floor((low + high) / 2);
        if (measure(fragment(boundaries[start], boundaries[middle])) <= max) { best = middle; low = middle + 1; } else high = middle - 1;
      }
      parts.push(fragment(boundaries[start], boundaries[best])); start = best;
    }
  } else {
    const table = element.matches("table") ? element : element.querySelector("table");
    const isList = element.matches("ol,ul");
    const children = table ? [...table.querySelectorAll(":scope > tbody > tr")] : isList ? [...element.children] : [];
    if (children.length > 1) {
      let group: Element[] = [], start = 0;
      const fragment = (entries: Element[], index: number) => {
        const copy = element.cloneNode(true) as Element;
        const body = table ? (copy.matches("table") ? copy : copy.querySelector("table")!).querySelector("tbody")! : copy;
        body.replaceChildren(...entries.map(entry => entry.cloneNode(true)));
        if (element.tagName === "OL") copy.setAttribute("start", String(Number(element.getAttribute("start") ?? 1) + index));
        return copy;
      };
      for (const child of children) {
        if (group.length && measure(fragment([...group, child], start)) > max) { parts.push(fragment(group, start)); start += group.length; group = []; }
        group.push(child);
      }
      if (group.length) parts.push(fragment(group, start));
    }
  }
  // Keep indivisible visuals intact on one sheet, with the same scale in
  // the reader and both exports, rather than creating invalid Word page sizes.
  return (parts.length ? parts : [element]).map(part => {
    const height = part === element ? element.getBoundingClientRect().height + marginHeight(element) : measure(part);
    if (height <= max) return part;
    const outer = document.createElement("div"), inner = document.createElement("div");
    outer.style.height = `${max}px`; outer.style.position = "relative";
    inner.style.cssText = `width:${EXPORT_PAGE.contentWidth}px;transform:scale(${max / height});transform-origin:top left;display:flow-root`;
    inner.append(part.cloneNode(true)); outer.append(inner); return outer;
  });
}

function measureUnits(markdown: HTMLElement): MeasuredUnit[] {
  const children = [...markdown.children].flatMap(element => splitLargeElement(element, markdown));
  const units: MeasuredUnit[] = [];
  for (let index = 0; index < children.length; index += 1) {
    const element = children[index];
    const next = children[index + 1];
    const measure = (node: Element) => {
      const detached = !node.isConnected; if (detached) markdown.append(node);
      const height = node.getBoundingClientRect().height + marginHeight(node);
      if (detached) node.remove(); return height;
    };
    const height = measure(element);
    if (isHeading(element) && next && height + measure(next) <= EXPORT_PAGE.contentHeight) {
      units.push({ nodes: [element, next], height: height + measure(next) });
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
    const wouldOverflow = (pageHasContent || used > 0) && used + unit.height > available;
    if (wouldOverflow) finishPage();
    bodyNodes.push(...unit.nodes);
    used += unit.height;
    pageHasContent = true;
    if (used > available) {
      page.style.height = `${Math.max(EXPORT_PAGE.cssHeight, used + EXPORT_PAGE.margin * 2 + EXPORT_PAGE.footerHeight)}px`;
      finishPage();
    }
  }
  if (pageHasContent || pages.length === 0 || (cover && pages.length === 1)) finishPage();

  const total = pages.length;
  pages.forEach((entry, index) => addFooter(entry.element, title, index + 1, total));
  return pages;
}
