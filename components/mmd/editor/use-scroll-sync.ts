"use client";

import { useEffect, useRef, type RefObject } from "react";
import type { CodeEditorHandle } from "./code-editor";
import { mapScrollOffset, normalizeScrollAnchors, type ScrollAnchor } from "@/lib/mmd/scroll-sync";

export function useScrollSync(editor: RefObject<CodeEditorHandle>, preview: RefObject<HTMLDivElement>, enabled: boolean, content: string, ready: boolean) {
  const active = useRef<"source" | "preview">("source");
  useEffect(() => {
    const handle = editor.current;
    const source = handle?.scrollElement();
    const rendered = preview.current;
    if (!enabled || !ready || !handle || !source || !rendered) return;
    let frame = 0;
    let syncingTo: "source" | "preview" | null = null;
    const expected: { source?: number; preview?: number } = {};

    function sync(from: "source" | "preview") {
      if (!source || !rendered || !handle) return;
      const sourceMax = source.scrollHeight - source.clientHeight;
      const previewMax = rendered.scrollHeight - rendered.clientHeight;
      if (sourceMax <= 0 || previewMax <= 0) return;
      const top = rendered.getBoundingClientRect().top;
      const anchors: ScrollAnchor[] = [];
      rendered.querySelectorAll<HTMLElement>("[data-source-line]").forEach(element => {
        // A contents wrapper preserves the block renderer's grid/flex layout.
        const box = getComputedStyle(element).display === "contents" ? element.firstElementChild : element;
        if (!box || !box.getClientRects().length || box.getBoundingClientRect().height === 0) return;
        anchors.push({ source: handle.lineTop(Number(element.dataset.sourceLine)), preview: box.getBoundingClientRect().top - top + rendered.scrollTop });
      });
      const points = normalizeScrollAnchors(anchors, sourceMax, previewMax);
      const to = from === "source" ? "preview" : "source";
      const target = to === "source" ? source : rendered;
      const offset = mapScrollOffset(points, from === "source" ? source.scrollTop : rendered.scrollTop, from);
      if (Math.abs(target.scrollTop - offset) > 1) {
        target.scrollTop = offset;
        expected[to] = target.scrollTop;
      }
    }
    function schedule(from: "source" | "preview") {
      cancelAnimationFrame(frame);
      syncingTo = from === "source" ? "preview" : "source";
      // CodeMirror measures wrapped lines as they enter its virtual viewport.
      // Reconcile against those measurements before releasing the target pane.
      let remaining = 4;
      const measure = () => {
        sync(from);
        if (--remaining > 0) frame = requestAnimationFrame(measure);
        else frame = requestAnimationFrame(() => { syncingTo = null; });
      };
      frame = requestAnimationFrame(measure);
    }
    function scroll(from: "source" | "preview") {
      if (from === syncingTo) return;
      const element = from === "source" ? source! : rendered!;
      const programmed = expected[from];
      delete expected[from];
      if (programmed !== undefined && Math.abs(element.scrollTop - programmed) <= 1) return;
      active.current = from;
      schedule(from);
    }
    const sourceScroll = () => scroll("source");
    const previewScroll = () => scroll("preview");
    const sourceIntent = () => { syncingTo = null; active.current = "source"; cancelAnimationFrame(frame); };
    const previewIntent = () => { syncingTo = null; active.current = "preview"; cancelAnimationFrame(frame); };
    const resize = () => schedule(active.current);
    source.addEventListener("scroll", sourceScroll, { passive: true });
    rendered.addEventListener("scroll", previewScroll, { passive: true });
    rendered.addEventListener("load", resize, true);
    rendered.addEventListener("toggle", resize, true);
    for (const event of ["wheel", "touchstart", "pointerdown", "keydown"]) {
      source.addEventListener(event, sourceIntent, { passive: true });
      rendered.addEventListener(event, previewIntent, { passive: true });
    }
    const observer = new ResizeObserver(resize);
    observer.observe(source);
    const sourceContent = source.querySelector(".cm-content");
    if (sourceContent) observer.observe(sourceContent);
    observer.observe(rendered);
    if (rendered.firstElementChild) observer.observe(rendered.firstElementChild);
    schedule(active.current);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      source.removeEventListener("scroll", sourceScroll);
      rendered.removeEventListener("scroll", previewScroll);
      rendered.removeEventListener("load", resize, true);
      rendered.removeEventListener("toggle", resize, true);
      for (const event of ["wheel", "touchstart", "pointerdown", "keydown"]) {
        source.removeEventListener(event, sourceIntent);
        rendered.removeEventListener(event, previewIntent);
      }
    };
  }, [editor, preview, enabled, content, ready]);
}
