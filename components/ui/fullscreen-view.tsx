"use client";

import { useState, type ReactNode } from "react";
import { Maximize2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";

export function FullscreenView({
  title,
  description,
  iconOnly = false,
  children,
}: {
  title: string;
  description?: string;
  iconOnly?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  if (open) {
    return (
      <Dialog
        open
        onOpenChange={setOpen}
        title={title}
        description={description}
        fullScreen
        className="bg-paper"
      >
        {children}
      </Dialog>
    );
  }

  if (iconOnly) {
    return (
      <div className="relative">
        {children}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`View ${title} full screen`}
          title="View full screen"
          className="absolute end-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-control border border-line bg-surface/90 text-ink-soft shadow-sm backdrop-blur transition-colors hover:bg-surface hover:text-ink focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Maximize2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-control border border-line px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-surface hover:text-ink focus-visible:ring-2 focus-visible:ring-accent"
        >
          View full screen
        </button>
      </div>
      {children}
    </div>
  );
}
