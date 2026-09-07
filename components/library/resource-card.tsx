import Link from "next/link";
import { BookOpen, FileText, Layers3, ListChecks, Star, Workflow, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type ResourceKind = "note" | "reviewer" | "quiz" | "diagram" | "book";

const resourceStyle: Record<ResourceKind, { icon: LucideIcon; label: string; tone: "memory" | "accent" | "neutral" | "book"; classes: string }> = {
  note: { icon: FileText, label: "Memory", tone: "memory", classes: "memory-surface border-memory/20" },
  reviewer: { icon: Layers3, label: "Reviewer", tone: "accent", classes: "border-accent/25" },
  quiz: { icon: ListChecks, label: "Quiz", tone: "neutral", classes: "border-line" },
  diagram: { icon: Workflow, label: "Diagram", tone: "memory", classes: "border-memory/20" },
  book: { icon: BookOpen, label: "Book", tone: "book", classes: "book-surface border-book/25 pl-6" },
};

interface ResourceCardProps {
  href: string;
  kind: ResourceKind;
  title: string;
  description?: string | null;
  meta?: string;
  badge?: string;
  favorite?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export function ResourceCard({ href, kind, title, description, meta, badge, favorite, children, className }: ResourceCardProps) {
  const style = resourceStyle[kind];
  const Icon = style.icon;
  return (
    <Link href={href} className={cn("card interactive-card group relative flex min-h-40 flex-col overflow-hidden p-4", style.classes, className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <Badge tone={style.tone}><Icon className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />{badge ?? style.label}</Badge>
        {meta && <span className="shrink-0 text-xs text-ink-faint">{meta}</span>}
      </div>
      <h2 className="font-display text-lg font-medium leading-snug tracking-[-0.01em] text-ink line-clamp-2">{title}</h2>
      {description && <p className="mt-1.5 text-sm leading-relaxed text-ink-soft line-clamp-2">{description}</p>}
      <div className="mt-auto pt-4">
        {favorite && <span className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-accent-dark"><Star className="h-3.5 w-3.5 fill-accent" /> Favorite</span>}
        {children}
      </div>
    </Link>
  );
}
