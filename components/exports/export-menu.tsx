"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Download } from "lucide-react";
import type { ExportProgressHandler } from "@/lib/export/types";

export interface ExportOption { value: string; label: string }

export function ExportMenu({ options, onExport, label = "Export" }: { options: ExportOption[]; onExport: (format: string, onProgress?: ExportProgressHandler) => void | Promise<void>; label?: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
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
      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-sm text-ink transition-colors hover:border-accent hover:bg-accent-soft focus-visible:ring-accent"
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
          setBusy(true);
          setProgressMessage("Preparing…");
          void Promise.resolve(onExport(option.value, (progress) => setProgressMessage(progress.message))).catch((error: unknown) => {
            window.alert(error instanceof Error ? error.message : "Could not export this document.");
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
  </div>;
}
