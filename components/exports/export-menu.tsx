"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, ChevronDown, Download } from "lucide-react";
import type { ExportProgressHandler } from "@/lib/export/types";
import { toast } from "@/components/ui/toast";

export interface ExportOption { value: string; label: string }
export function ExportMenu({ options, onExport, label = "Export" }: { options: ExportOption[]; onExport: (format: string, onProgress?: ExportProgressHandler) => void | Promise<void>; label?: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressMessage, setProgressMessage] = useState("Preparing…");
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!open) return;
    function positionMenu() {
      if (!buttonRef.current || !menuRef.current) return;
      const bounds = buttonRef.current.getBoundingClientRect();
      const { offsetHeight: height, offsetWidth: width } = menuRef.current;
      setPosition({ left: Math.max(12, Math.min(bounds.right - width, window.innerWidth - width - 12)), top: bounds.bottom + height + 6 <= window.innerHeight - 12 ? bounds.bottom + 6 : Math.max(12, bounds.top - height - 6) });
    }
    positionMenu();
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    window.addEventListener("resize", positionMenu);
    window.addEventListener("scroll", positionMenu, true);
    return () => { window.removeEventListener("resize", positionMenu); window.removeEventListener("scroll", positionMenu, true); };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) { if (!menuRef.current?.contains(event.target as Node) && !buttonRef.current?.contains(event.target as Node)) setOpen(false); }
    function escape(event: KeyboardEvent) { if (event.key === "Escape") { setOpen(false); buttonRef.current?.focus(); } }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);
  async function runExport(format: string) {
    setOpen(false); setError(null); setBusy(true); setProgressMessage("Preparing…");
    buttonRef.current?.focus();
    try { await onExport(format, progress => setProgressMessage(progress.message)); toast("Export prepared. Check your downloads."); }
    catch (caught) { const message = caught instanceof Error ? caught.message : "Could not export. Please try again."; setError(message); toast(message, "error"); }
    finally { setBusy(false); }
  }
  return <div className="relative inline-block">
    <button ref={buttonRef} type="button" aria-haspopup="menu" aria-expanded={open} disabled={busy} aria-busy={busy} onClick={() => setOpen(value => !value)} className="inline-flex min-h-11 items-center gap-1.5 rounded-control border border-line bg-surface px-3 text-sm text-ink transition-colors hover:border-accent hover:bg-accent-soft sm:min-h-10"><Download className="h-3.5 w-3.5" /><span>{busy ? progressMessage : label}</span><ChevronDown className={`ml-1 h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} /></button>
    {open && createPortal(<div ref={menuRef} role="menu" aria-label={`${label} format`} style={position} onKeyDown={event => {
      if (event.key === "Tab") { setOpen(false); buttonRef.current?.focus(); return; }
      const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]'));
      const index = items.indexOf(document.activeElement as HTMLElement);
      const next = event.key === "ArrowDown" ? (index + 1) % items.length : event.key === "ArrowUp" ? (index - 1 + items.length) % items.length : event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : -1;
      if (next >= 0) { event.preventDefault(); items[next]?.focus(); }
    }} className="fixed z-[100] max-h-[calc(100dvh-1.5rem)] w-56 max-w-[calc(100vw-1.5rem)] overflow-auto rounded-lg border border-line bg-surface p-1 shadow-card-hover">{options.map(option => <button key={option.value} type="button" role="menuitem" onClick={() => void runExport(option.value)} className="block min-h-11 w-full rounded-md px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-accent-soft focus:bg-accent-soft">{option.label}</button>)}</div>, document.body)}
    {error && <p className="mt-2 flex max-w-64 items-start gap-1.5 text-xs text-danger" role="alert"><AlertCircle className="h-4 w-4 shrink-0" />{error}</p>}
  </div>;
}
