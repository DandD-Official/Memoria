"use client";
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ListTree } from "lucide-react";
import { MmdRenderer as MarkdownRenderer } from "@/components/mmd/renderer";
import { MobileContents } from "@/components/library/mobile-contents";
import { ReadAloud } from "@/components/library/read-aloud";

export type RelatedMaterial = { id: string; title: string; href: string };
export function DocumentReader({ content, kind, title, next, resolvedAssets, related = [] }: { content: string; kind: "note" | "reviewer"; title?: string; next?: React.ReactNode; resolvedAssets?: Record<string, string | null>; related?: RelatedMaterial[] }) {
  const articleRef = useRef<HTMLElement>(null);
  const prefix = useId().replaceAll(":", "");
  const [outline, setOutline] = useState<{ id: string; title: string; level: number }[]>([]);
  const [active, setActive] = useState("");
  useEffect(() => {
    const headings = Array.from(articleRef.current?.querySelectorAll<HTMLElement>("h1, h2, h3") ?? []).filter(heading => !heading.closest("svg"));
    headings.forEach((heading, index) => { if (!heading.id) heading.id = `${prefix}-section-${index}`; heading.style.scrollMarginTop = "7rem"; heading.tabIndex = -1; });
    setOutline(headings.map(heading => ({ id: heading.id, title: heading.textContent ?? "Section", level: Number(heading.tagName[1]) })));
    const observer = new IntersectionObserver(entries => { for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.id); }, { rootMargin: "-90px 0px -65% 0px" });
    headings.forEach(heading => observer.observe(heading));
    return () => observer.disconnect();
  }, [content, prefix]);
  const minutes = Math.max(1, Math.ceil(content.trim().split(/\s+/).length / 220));
  const margin = (select?: (navigate: () => void) => void) => <>
    <div><p className="index-label">In the margin</p><p className="mt-3 text-xs text-ink-soft">About {minutes} {minutes === 1 ? "minute" : "minutes"} to read</p></div>
    {outline.length > 0 ? <details open className="border-t border-line pt-4"><summary className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium"><ListTree className="h-4 w-4 text-ink-faint" aria-hidden="true" />On this page</summary><nav aria-label="Document sections" className="mt-2 space-y-1">{outline.map(heading => <a key={heading.id} href={`#${heading.id}`} aria-current={active === heading.id ? "location" : undefined} onClick={event => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
      const navigate = () => { const element = document.getElementById(heading.id); element?.focus({ preventScroll: true }); window.location.hash = heading.id; element?.scrollIntoView({ block: "start" }); setActive(heading.id); };
      if (select) { event.preventDefault(); select(navigate); }
      else document.getElementById(heading.id)?.focus({ preventScroll: true });
    }} className={`block min-h-11 border-s-2 py-2 pe-1 text-sm leading-relaxed lg:text-xs ${heading.level === 3 ? "ps-5" : "ps-3"} ${active === heading.id ? "border-action font-medium text-ink" : "border-transparent text-ink-soft hover:border-line-strong"}`}>{heading.title}</a>)}</nav></details> : <p className="text-sm text-ink-soft">This memory has no section headings.</p>}
    {related.length > 0 && <section className="border-t border-line pt-5"><h2 className="index-label">Connected material</h2>{related.map(item => <Link key={item.href} href={item.href} onClick={() => { if (select) select(() => {}); }} className="mt-3 flex min-h-11 items-start gap-2 text-xs leading-relaxed text-ink-soft hover:text-accent-dark"><span>{item.title}</span><ArrowUpRight className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" /></Link>)}</section>}
    <p className="annotation">{kind === "reviewer" ? "Pause after a section. Can you explain the idea without looking?" : "Look for a connection worth keeping. A guide or diagram can help it take shape."}</p>
  </>;
  return <div className="document-layout">
    <div className="min-w-0"><div className="mb-4"><ReadAloud content={content} title={title} /></div><article ref={articleRef} id={`${prefix}-content`} className="document-body border-t-2 border-action"><MarkdownRenderer content={content} resolvedAssets={resolvedAssets} /></article>{next && <section className="mt-8 border-t border-line py-7"><p className="eyebrow">Make this understanding stick</p><h2 className="mt-3 section-heading">Take the next step.</h2><div className="mt-5 flex flex-wrap gap-3">{next}</div></section>}</div>
    <aside className="document-margin hidden lg:block" tabIndex={0} aria-label="Document outline and related material">{margin()}</aside>
    <MobileContents>{select => <div className="space-y-6">{margin(select)}</div>}</MobileContents>
  </div>;
}
