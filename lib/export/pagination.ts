import { buildGeometricPages } from "@/lib/export/geometric-pages";
import { EXPORT_PAGE } from "@/lib/export/constants";
import type { CanonicalPage } from "@/lib/export/types";

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

/** Nested geometry is shared by note exports and Book reader/export pages. */
export function paginateMmdSurface(root: HTMLElement, title: string): CanonicalPage[] {
  const cover = root.querySelector<HTMLElement>(":scope > [data-export-cover]");
  const flow = root.querySelector<HTMLElement>(":scope > .mmd-export-flow");
  if (!flow) throw new Error("The MMD export surface did not render its document flow.");
  const pages: CanonicalPage[] = [];
  if (cover) {
    const page = pageElement(); page.classList.add("mmd-export-cover-page"); page.append(cover.cloneNode(true));
    pages.push({ element: page, width: EXPORT_PAGE.cssWidth, height: EXPORT_PAGE.cssHeight });
  }
  for (const fragment of buildGeometricPages(flow)) {
    const page = pageElement(); page.append(fragment.content);
    pages.push({ element: page, width: EXPORT_PAGE.cssWidth, height: EXPORT_PAGE.cssHeight });
  }
  if (!pages.length) pages.push({ element: pageElement(), width: EXPORT_PAGE.cssWidth, height: EXPORT_PAGE.cssHeight });
  pages.forEach((page, index) => addFooter(page.element, title, index + 1, pages.length));
  return pages;
}
