"use client";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  fullScreen?: boolean;
  placement?: "center" | "side";
}
export function Dialog({ open, onOpenChange, title, description, children, footer, className, fullScreen = false, placement = "center" }: DialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [present, setPresent] = useState(open);
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;
  useEffect(() => {
    if (open) { setPresent(true); return; }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.classList.contains("reduce-motion");
    const timeout = window.setTimeout(() => setPresent(false), reduced ? 0 : 160);
    return () => window.clearTimeout(timeout);
  }, [open]);
  useEffect(() => {
    if (!present || !dialogRef.current) return;
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [present]);
  if (!present || typeof document === "undefined") return null;
  return createPortal(
    <dialog ref={dialogRef} data-state={open ? "open" : "closing"} aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined}
      onCancel={event => { event.preventDefault(); onOpenChangeRef.current(false); }}
      onClick={event => { if (event.target === event.currentTarget) { const bounds = event.currentTarget.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onOpenChangeRef.current(false); } }}
      className={cn("native-overlay w-full overscroll-contain border border-line bg-surface-raised p-5 text-ink shadow-dialog sm:p-7",
        fullScreen ? "fixed inset-0 m-0 h-dvh max-h-dvh max-w-none rounded-none border-0" :
        placement === "side" ? "fixed inset-x-0 bottom-0 top-auto m-0 max-h-[90dvh] max-w-none rounded-t-panel pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:bottom-0 sm:left-auto sm:right-0 sm:top-0 sm:ms-auto sm:h-dvh sm:max-h-dvh sm:max-w-md sm:rounded-none" :
        "fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] max-w-[calc(100%-2rem)] rounded-panel sm:max-w-lg",
        className)}>
      <div className="border-b border-line pb-5 pe-10"><h2 id={titleId} className="font-display text-2xl leading-tight tracking-tight">{title}</h2>{description && <p id={descriptionId} className="mt-2 text-sm leading-relaxed text-ink-soft">{description}</p>}</div>
      <button type="button" onClick={() => onOpenChange(false)} className="absolute end-4 top-4 flex h-11 w-11 items-center justify-center rounded-control text-ink-soft hover:bg-surface-muted" aria-label="Close dialog"><X className="h-5 w-5" /></button>
      <div className="mt-6">{children}</div>
      {footer && <div className="mt-7 flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:justify-end">{footer}</div>}
    </dialog>, document.body
  );
}
