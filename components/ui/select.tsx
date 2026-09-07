import { forwardRef } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          "h-10 w-full appearance-none rounded-control border border-line-strong bg-surface py-0 pl-3 pr-9 text-sm text-ink shadow-sm transition-[border-color,box-shadow,background-color] hover:border-ink-faint focus:border-accent disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-faint aria-[invalid=true]:border-danger",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
    </div>
  )
);
Select.displayName = "Select";
