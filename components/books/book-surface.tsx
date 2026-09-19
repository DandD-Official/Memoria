"use client";
import { MemoryMark } from "@/components/layout/brand";
import { MmdRenderer } from "@/components/mmd/renderer";
import { CodeThemeProvider } from "@/components/mmd/code-theme-context";
import type { MmdAssetRegistry } from "@/lib/export/asset-registry";
import type { BookDocument } from "@/lib/books/document";

export function BookSurface({ book, assetRegistry }: { book: BookDocument; assetRegistry?: MmdAssetRegistry }) {
  return <div className="mmd-export-surface book-paper" data-book-source>
    <section className={`book-cover${book.title.length + (book.subtitle?.length ?? 0) + (book.description?.length ?? 0) > 900 ? " book-cover-compact" : ""}`} data-book-cover>
      <div className="book-cover-brand"><MemoryMark /><span>memoria.</span></div>
      <div className="book-cover-orbit" aria-hidden="true"><span /><span /><span /></div>
      <div className="book-cover-heading"><p className="book-small-label">A collection of connected ideas</p><h1>{book.title}</h1>{book.subtitle && <p className="book-cover-subtitle">{book.subtitle}</p>}</div>
      <div className="book-cover-bottom"><p>{book.description}</p><div><span>Curated by {book.author}</span><span>{String(book.chapters.length).padStart(2, "0")} chapters</span></div></div>
    </section>
    <section className="book-contents-source" data-book-contents>
      <header className="book-section-heading"><p className="book-small-label">Your reading journey</p><h2>{book.tocTitle}</h2><p>{book.title}</p></header>
      <ol>{book.chapters.map((chapter, index) => <li key={chapter.id} data-book-toc-row={chapter.id}><span className="book-toc-number">{String(index + 1).padStart(2, "0")}</span><div><span className="book-small-label">{chapter.kind === "NOTE" ? "Source note" : chapter.kind === "REVIEWER" ? "Study guide" : "Practice"}</span><strong><a href={`#chapter-${chapter.id}`} data-book-goto={chapter.id}>{chapter.title}</a></strong></div><span className="book-toc-page" data-book-page-for={chapter.id}>—</span></li>)}</ol>
      {!book.chapters.length && <p className="book-empty">A fresh book. Add a chapter to begin.</p>}
    </section>
    <CodeThemeProvider>{book.chapters.map((chapter, index) => <section key={chapter.id} data-book-chapter={chapter.id} className="book-chapter-source">
      <div className="mmd-export-flow">
        <header className="mmd-export-brand-header book-chapter-kicker"><span>CHAPTER {String(index + 1).padStart(2, "0")}</span><span>{chapter.kind === "QUIZ" ? "Practice & recall" : "Read & connect"}</span></header>
        <div className="mmd-export-document-title book-chapter-title"><h2>{chapter.title}</h2>{chapter.description && <p>{chapter.description}</p>}</div>
        <MmdRenderer content={chapter.content} mode="export" assetRegistry={assetRegistry} resolvedAssets={book.assets} />
      </div>
    </section>)}</CodeThemeProvider>
  </div>;
}
