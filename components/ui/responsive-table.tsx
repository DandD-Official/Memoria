import { cn } from "@/lib/utils";
import { useId } from "react";

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
  return (
    <div className={cn("responsive-table my-4 min-w-0 max-w-full", className)} {...props}>
      <div className="responsive-table__viewport" tabIndex={0} role="region" aria-label="Scrollable table" aria-describedby={hintId}>
        {children}
      </div>
      <p id={hintId} className="responsive-table__hint">{label}</p>
    </div>
  );
}
