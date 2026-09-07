import { cn } from "@/lib/utils";

type Tone = "neutral" | "accent" | "success" | "warning" | "danger" | "memory" | "book";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-ink/5 text-ink-soft",
  accent: "bg-accent-soft text-accent-dark",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
  memory: "bg-memory-soft text-memory",
  book: "bg-book-soft text-book",
};

export function Badge({ tone = "neutral", className, ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn("inline-flex min-h-6 items-center rounded-full px-2.5 py-0.5 text-xs font-medium", toneClasses[tone], className)}
      {...props}
    />
  );
}
