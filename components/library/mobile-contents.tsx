"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ListTree } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";

export function MobileContents({ children }: { children: (select: (navigate: () => void) => void) => ReactNode }) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<Element | null>(null);
  const pendingNavigation = useRef<(() => void) | null>(null);
  useEffect(() => {
    const updateTarget = () => setTarget(document.fullscreenElement ?? document.querySelector(".reader-fullscreen") ?? document.body);
    updateTarget();
    document.addEventListener("fullscreenchange", updateTarget);
    window.addEventListener("memoria:reader-fullscreen", updateTarget);
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => { if (desktop.matches) setOpen(false); };
    desktop.addEventListener("change", closeOnDesktop);
    return () => { document.removeEventListener("fullscreenchange", updateTarget); window.removeEventListener("memoria:reader-fullscreen", updateTarget); desktop.removeEventListener("change", closeOnDesktop); };
  }, []);
  return <>
    {target && createPortal(<button type="button" aria-label="Open contents" title="Contents" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)} className="mobile-contents-trigger fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] end-4 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-line-strong bg-action text-action-foreground shadow-dialog lg:hidden print:hidden"><ListTree className="h-5 w-5" aria-hidden="true" /></button>, target)}
    <Dialog open={open} onOpenChange={setOpen} title="Contents" description="Choose a section to jump to it." placement="side" onAfterClose={() => { const navigate = pendingNavigation.current; pendingNavigation.current = null; navigate?.(); }}>
      {children(navigate => { pendingNavigation.current = navigate; setOpen(false); })}
    </Dialog>
  </>;
}
