"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, ChevronDown, Download } from "lucide-react";
import type { ExportProgressHandler } from "@/lib/export/types";

export interface ExportOption { value: string; label: string }

export function ExportMenu({ options, onExport, label = "Export" }: { options: ExportOption[]; onExport: (format: string, onProgress?: ExportProgressHandler) => void | Promise<void>; label?: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressMessage, setProgressMessage] = useState("Preparing…");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return <div ref={menuRef} className="relative inline-block">
    <button
      type="button"
      aria-haspopup="menu"
      aria-expanded={open}
      disabled={busy}
      onClick={() => setOpen((current) => !current)}
      className="inline-flex h-9 items-center gap-1.5 rounded-control border border-line bg-surface px-3 text-sm text-ink transition-colors hover:border-accent hover:bg-accent-soft"
    >
      <Download className="h-3.5 w-3.5" />
      <span>{busy ? progressMessage : `${label}…`}</span>
      <ChevronDown className={`ml-1 h-3.5 w-3.5 text-ink-faint transition-transform ${open ? "rotate-180" : ""}`} />
    </button>

    {open && <div role="menu" aria-label={`${label} format`} className="absolute left-0 z-50 mt-1 min-w-48 overflow-hidden rounded-lg border border-line bg-surface p-1 shadow-card-hover">
      {!busy && options.map((option) => <button
        key={option.value}
        type="button"
        role="menuitem"
        onClick={() => {
          setOpen(false);
          setError(null);
          setBusy(true);
          setProgressMessage("Preparing…");
          void Promise.resolve(onExport(option.value, (progress) => setProgressMessage(progress.message))).catch((caught: unknown) => {
            setError(caught instanceof Error ? caught.message : "Could not export this document.");
          }).finally(() => {
            setBusy(false);
            setProgressMessage("Preparing…");
          });
        }}
        className="block w-full rounded-md px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-accent-soft hover:text-ink focus:bg-accent-soft focus:text-ink focus:outline-none"
      >
        {option.label}
      </button>)}
    </div>}
    {error && <p className="absolute start-0 top-11 z-40 flex w-64 items-start gap-1.5 rounded-control border border-danger/25 bg-surface-raised p-2 text-xs leading-relaxed text-danger shadow-card" role="alert"><AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />{error}</p>}
  </div>;
}
