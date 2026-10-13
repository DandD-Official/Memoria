"use client";

import { cn } from "@/lib/utils";
import { useId, useState } from "react";
import { MoveHorizontal, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMmdRenderContext } from "@/components/mmd/render-context";

interface ResponsiveTableProps extends React.HTMLAttributes<HTMLDivElement> {
  /** A short hint for narrow screens; keep it visible only when scrolling is useful. */
  label?: string;
}

/**
 * Contains wide tables inside the document instead of allowing them to widen
 * the page viewport. The table itself remains semantic and keyboard-readable.
 */
export function ResponsiveTable({ className, label = "Scroll horizontally to view more columns", children, ...props }: ResponsiveTableProps) {
  const hintId = useId();
  const viewportId = useId();
  const [view, setView] = useState<"scroll" | "fit">("scroll");
  const { mode } = useMmdRenderContext();
  const isExport = mode === "export";
  const tableView = isExport ? "scroll" : view;
  return (
    <div className={cn("responsive-table my-4 min-w-0 max-w-full", className)} {...props}>
      {!isExport && <div className="responsive-table__controls mb-2 flex flex-wrap justify-end gap-1" role="group" aria-label="Table view">
        <Button type="button" size="sm" variant={view === "scroll" ? "secondary" : "ghost"} aria-pressed={view === "scroll"} aria-controls={viewportId} onClick={() => setView("scroll")}>
          <MoveHorizontal className="h-4 w-4" aria-hidden="true" />Scroll
        </Button>
        <Button type="button" size="sm" variant={view === "fit" ? "secondary" : "ghost"} aria-pressed={view === "fit"} aria-controls={viewportId} onClick={() => setView("fit")}>
          <Minimize2 className="h-4 w-4" aria-hidden="true" />Fit to width
        </Button>
      </div>}
      <div id={viewportId} className="responsive-table__viewport" data-table-view={tableView} tabIndex={0} role="region" aria-label={tableView === "scroll" ? "Scrollable table" : "Table fitted to width"} aria-describedby={hintId}>
        {children}
      </div>
      <p id={hintId} className="responsive-table__hint">{tableView === "scroll" ? label : "Fit to width uses smaller text and wrapped columns."}</p>
    </div>
  );
}
