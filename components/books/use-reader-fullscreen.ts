"use client";

import { useEffect, useRef, useState } from "react";
import { lockBodyScroll } from "@/lib/body-scroll-lock";

/** Keep the same reader mounted so pages, practice, and playback survive fullscreen. */
export function useReaderFullscreen() {
  const ref = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const native = useRef(false);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const sync = () => {
      if (document.fullscreenElement === ref.current) { native.current = true; setFullscreen(true); }
      else if (native.current) { native.current = false; setFullscreen(false); }
    };
    document.addEventListener("fullscreenchange", sync);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      if (native.current && document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    };
  }, []);

  useEffect(() => {
    const element = ref.current;
    if (!fullscreen || !element) return;
    const unlockScroll = lockBodyScroll();
    window.dispatchEvent(new Event("memoria:reader-fullscreen"));
    const siblings: { element: HTMLElement; inert: boolean }[] = [];
    for (let branch: HTMLElement = element; branch.parentElement; branch = branch.parentElement) {
      for (const sibling of Array.from(branch.parentElement.children)) {
        if (sibling !== branch && sibling instanceof HTMLElement && !["SCRIPT", "STYLE"].includes(sibling.tagName)) {
          siblings.push({ element: sibling, inert: sibling.inert }); sibling.inert = true;
        }
      }
    }
    element.focus({ preventScroll: true });
    function onKeyDown(event: KeyboardEvent) {
      // A nested contents or visual dialog owns its keyboard interactions.
      if (document.querySelector("dialog[open]")) return;
      if (event.key === "Escape" && !document.fullscreenElement) { event.preventDefault(); setFullscreen(false); }
      if (event.key !== "Tab") return;
      const focusable = Array.from(element!.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], select:not(:disabled), input:not(:disabled), [tabindex="0"]')).filter(item => item.getClientRects().length && !item.closest("[inert]"));
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === element)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === element)) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      unlockScroll();
      siblings.forEach(item => { item.element.inert = item.inert; });
      window.dispatchEvent(new Event("memoria:reader-fullscreen"));
      trigger.current?.focus({ preventScroll: true });
    };
  }, [fullscreen]);

  function toggle() {
    if (fullscreen) {
      if (document.fullscreenElement === ref.current) void document.exitFullscreen().catch(() => { setFullscreen(false); });
      else setFullscreen(false);
      return;
    }
    trigger.current = document.activeElement as HTMLElement | null;
    setFullscreen(true);
    // iOS and embedded browsers can use the same viewport-filling layout without this API.
    if (ref.current?.requestFullscreen && document.fullscreenEnabled) void ref.current.requestFullscreen().catch(() => {});
  }

  return { ref, fullscreen, toggle };
}
