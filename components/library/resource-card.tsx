import Link from "next/link";
import { ArrowUpRight, BookOpen, FileText, Layers3, ListChecks, Star, Workflow, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type ResourceKind = "note" | "reviewer" | "quiz" | "diagram" | "book";
const resourceStyle: Record<ResourceKind, { icon: LucideIcon; label: string; tone: string }> = {
  note: { icon: FileText, label: "Source note", tone: "text-memory" },
  reviewer: { icon: Layers3, label: "Study guide", tone: "text-accent-dark" },
  quiz: { icon: ListChecks, label: "Practice", tone: "text-study" },
  diagram: { icon: Workflow, label: "Diagram", tone: "text-memory" },
  book: { icon: BookOpen, label: "Study space", tone: "text-book" },
};
interface ResourceCardProps { href: string; kind: ResourceKind; title: string; description?: string | null; meta?: string; badge?: string; favorite?: boolean; children?: React.ReactNode; className?: string }
export function ResourceCard({ href, kind, title, description, meta, badge, favorite, children, className }: ResourceCardProps) {
  const style = resourceStyle[kind];
  return <Link href={href} title={title} className={cn("group resource-entry", className)}>
    <span className={cn("resource-glyph", style.tone)}><style.icon className="h-5 w-5" aria-hidden="true" /></span>
    <div className="min-w-0"><p className="mb-1.5 flex flex-wrap items-center gap-2 text-[11px] text-ink-faint"><span>{style.label}</span>{badge && <><span aria-hidden="true">/</span><span>{badge.replaceAll("_", " ").toLowerCase()}</span></>}{favorite && <span className="inline-flex items-center gap-1 text-accent-dark"><Star className="h-3 w-3 fill-accent" />Favorite</span>}</p><h2 className="break-words group-hover:text-accent-dark">{title}</h2>{description && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-soft line-clamp-2">{description}</p>}{children && <div className="mt-2">{children}</div>}</div>
    <span className="flex items-center gap-3 text-xs text-ink-faint sm:ps-5">{meta}<ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" /></span>
  </Link>;
}
