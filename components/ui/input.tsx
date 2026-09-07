import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded-control border border-line-strong bg-surface px-3 text-sm text-ink shadow-sm transition-[border-color,box-shadow,background-color] placeholder:text-ink-faint hover:border-ink-faint focus:border-accent disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-faint aria-[invalid=true]:border-danger aria-[invalid=true]:ring-1 aria-[invalid=true]:ring-danger/25",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "w-full rounded-control border border-line-strong bg-surface px-3 py-2.5 text-sm leading-relaxed text-ink shadow-sm transition-[border-color,box-shadow,background-color] placeholder:text-ink-faint hover:border-ink-faint focus:border-accent disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-faint aria-[invalid=true]:border-danger aria-[invalid=true]:ring-1 aria-[invalid=true]:ring-danger/25",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

export const Label = ({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label className={cn("mb-1.5 block text-sm font-medium text-ink", className)} {...props} />
);

export function FieldHint({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("mt-1.5 text-xs leading-relaxed text-ink-faint", className)} {...props} />;
}

export function FieldError({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("mt-1.5 text-xs font-medium text-danger", className)} role="alert" {...props} />;
}
