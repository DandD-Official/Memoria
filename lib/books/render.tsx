import type { BookOutlineEntry } from "./reader-state";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { BookSurface } from "@/components/books/book-surface";
import type { BookDocument } from "@/lib/books/document";
import { createMmdAssetRegistry } from "@/lib/export/asset-registry";
import { prepareMmdForExport } from "@/lib/export/prepare-export";
import { paginateMmdSurface } from "@/lib/export/pagination";
import { EXPORT_PAGE } from "@/lib/export/constants";
import type { CanonicalPage } from "@/lib/export/types";

export interface RenderedBook { pages: CanonicalPage[]; outline: BookOutlineEntry[]; chapterPages: Record<string, number>; cleanup: () => void }

/** The reader and downloads use these exact DOM pages, including resolved MMD assets. */
export async function renderBook(book: BookDocument): Promise<RenderedBook> {
  // Readers call from a React effect. Leave that lifecycle before mounting
  // the isolated root, so flushSync is safe and measurements see committed DOM.
  await new Promise<void>(resolve => queueMicrotask(resolve));
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:-100000px;top:0;pointer-events:none";
  host.setAttribute("aria-hidden", "true");
  host.inert = true;
  document.body.append(host);
  const root = createRoot(host);
  const registry = createMmdAssetRegistry();
  let releaseAssets = () => {};
  let disposed = false;
  const cleanup = () => { if (disposed) return; disposed = true; releaseAssets(); host.remove(); queueMicrotask(() => root.unmount()); };
  try {
    flushSync(() => root.render(<BookSurface book={book} assetRegistry={registry} />));
    const source = host.querySelector<HTMLElement>("[data-book-source]")!;
    const assets = await prepareMmdForExport(source, { assetRegistry: registry });
    releaseAssets = assets.cleanup;
    if (assets.failedAssets.length || source.querySelector('[data-mmd-asset-state="error"]')) throw new Error("A book image or diagram could not load. Check the chapter and try again.");
    const sourceCover = source.querySelector<HTMLElement>("[data-book-cover]")!;
    if (sourceCover.lastElementChild!.getBoundingClientRect().bottom > sourceCover.getBoundingClientRect().bottom - 56) sourceCover.classList.add("book-cover-compact");
    const pages: CanonicalPage[] = [];
    const makePage = () => {
      const element = document.createElement("div");
      element.className = `mmd-export-surface mmd-export-page book-paper book-page ${book.kind === "NOTEBOOK" ? "notebook-paper" : ""}`;
      element.style.height = `${EXPORT_PAGE.cssHeight}px`;
      return { element, width: EXPORT_PAGE.cssWidth, height: EXPORT_PAGE.cssHeight };
    };
    const cover = makePage();
    cover.element.append(sourceCover.cloneNode(true));
    pages.push(cover);
    const contents = source.querySelector<HTMLElement>("[data-book-contents]")!;
    const rows = [...contents.querySelectorAll<HTMLElement>("[data-book-toc-row]")];
    let tocPage = makePage();
    const startContents = () => {
      const body = document.createElement("div"); body.className = "book-contents-source";
      body.append(contents.querySelector("header")!.cloneNode(true));
      const list = document.createElement("ol"); body.append(list); tocPage.element.append(body);
      return list;
    };
    let list = startContents();
    let used = contents.querySelector("header")!.getBoundingClientRect().height + 40;
    for (const row of rows) {
      const height = row.getBoundingClientRect().height;
      if (list.children.length && used + height > EXPORT_PAGE.contentHeight) {
        pages.push(tocPage); tocPage = makePage(); list = startContents(); used = contents.querySelector("header")!.getBoundingClientRect().height + 40;
      }
      const clone = row.cloneNode(true) as HTMLElement;
      // Keep a title with its first memory, and repeat it on continuation pages.
      if (!list.children.length && !clone.querySelector("[data-book-toc-group]")) {
        const heading = rows.find(candidate => candidate.dataset.bookTocGroupKey === row.dataset.bookTocGroupKey)?.querySelector<HTMLElement>("[data-book-toc-group]");
        if (heading) { clone.prepend(heading.cloneNode(true)); used += heading.getBoundingClientRect().height; }
      }
      list.append(clone); used += height;
    }
    if (!rows.length) list.parentElement!.append(contents.querySelector(".book-empty")!.cloneNode(true));
    pages.push(tocPage);
    const chapterPages: Record<string, number> = {};
    for (const chapter of source.querySelectorAll<HTMLElement>("[data-book-chapter]")) {
      chapterPages[chapter.dataset.bookChapter!] = pages.length + 1;
      const chapterResult = paginateMmdSurface(chapter, book.title);
      for (const page of chapterResult) {
        page.element.classList.add("book-paper", "book-page");
        if (book.kind === "NOTEBOOK") page.element.classList.add("notebook-paper");
        page.element.querySelector(".mmd-export-footer")?.remove();
        pages.push(page);
      }
    }
    pages.forEach((page, index) => {
      page.element.dataset.bookPage = String(index + 1);
      page.element.querySelectorAll<HTMLElement>("[data-book-page-for]").forEach(el => { el.textContent = String(chapterPages[el.dataset.bookPageFor!] ?? ""); });
      if (index > 0) {
        const footer = document.createElement("footer"); footer.className = "mmd-export-footer";
        const title = document.createElement("span"); title.textContent = `memoria. / ${book.title}`;
        const count = document.createElement("span"); count.textContent = `${index + 1} / ${pages.length}`;
        footer.append(title, count); page.element.append(footer);
      }
      host.append(page.element);
    });
    const outline: BookOutlineEntry[] = [];
    pages.forEach((page, pageIndex) => {
      const pageRect = page.element.getBoundingClientRect();
      for (const heading of page.element.querySelectorAll<HTMLElement>("h1,h2,h3,h4,h5,h6")) {
        const rect = heading.getBoundingClientRect();
        const clip = heading.closest(".mmd-page-window")?.getBoundingClientRect() ?? pageRect;
        if (!rect.height || rect.bottom <= clip.top || rect.top >= clip.bottom) continue;
        const id = `book-heading-${outline.length}`;
        heading.dataset.bookHeading = id;
        outline.push({ id, title: heading.textContent?.trim() || "Heading", level: Number(heading.tagName.slice(1)), page: pageIndex });
      }
    });
    return { pages, chapterPages, outline, cleanup };
  } catch (error) { cleanup(); throw error; }
}
