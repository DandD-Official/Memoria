import { cn } from "@/lib/utils";

type CardVariant = "default" | "muted" | "memory" | "book";

const variants: Record<CardVariant, string> = {
  default: "card",
  muted: "surface-muted",
  memory: "card memory-surface border-memory/20",
  book: "card book-surface border-book/25 pl-6",
};

export function Card({ className, variant = "default", ...props }: React.HTMLAttributes<HTMLDivElement> & { variant?: CardVariant }) {
  return <div className={cn("min-w-0 p-5", variants[variant], className)} {...props} />;
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-3 flex items-start justify-between gap-3", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("font-display text-lg font-medium leading-snug tracking-[-0.01em] text-ink", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm leading-relaxed text-ink-soft", className)} {...props} />;
}
