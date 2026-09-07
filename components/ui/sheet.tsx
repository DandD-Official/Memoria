"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

const focusable = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Sheet({ open, onOpenChange, title, description, children, className }: SheetProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => (panelRef.current?.querySelector<HTMLElement>(focusable) ?? panelRef.current)?.focus());
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); onOpenChangeRef.current(false); return; }
      if (event.key !== "Tab" || !panelRef.current) return;
      const nodes = Array.from(panelRef.current.querySelectorAll<HTMLElement>(focusable));
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[100]" role="presentation">
      <button className="absolute inset-0 animate-overlay-in bg-ink/45 backdrop-blur-[2px]" onClick={() => onOpenChange(false)} aria-hidden="true" tabIndex={-1} />
      <aside ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined} tabIndex={-1} className={cn("absolute inset-x-0 bottom-0 max-h-[min(44rem,calc(100dvh-1rem))] animate-sheet-in overflow-y-auto rounded-t-panel border border-line bg-surface-raised p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-dialog sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-full sm:max-w-md sm:animate-sheet-side-in sm:rounded-none sm:border-y-0 sm:border-r-0 sm:p-6", className)}>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line-strong sm:hidden" aria-hidden="true" />
        <div className="pr-10">
          <h2 id={titleId} className="font-display text-xl font-medium text-ink">{title}</h2>
          {description && <p id={descriptionId} className="mt-1.5 text-sm leading-relaxed text-ink-soft">{description}</p>}
        </div>
        <button type="button" onClick={() => onOpenChange(false)} className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-control text-ink-faint hover:bg-ink/5 hover:text-ink" aria-label="Close panel"><X className="h-4 w-4" /></button>
        <div className="mt-5">{children}</div>
      </aside>
    </div>,
    document.body
  );
}
