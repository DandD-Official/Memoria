import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button, buttonStyles } from "@/components/ui/button";
import { cn } from "@/lib/utils";
interface EmptyStateProps { icon: LucideIcon; title: string; description: string; actionLabel?: string; onAction?: () => void; actionHref?: string; secondaryActionLabel?: string; secondaryActionHref?: string; className?: string }
export function EmptyState({ icon: Icon, title, description, actionLabel, onAction, actionHref, secondaryActionLabel, secondaryActionHref, className }: EmptyStateProps) {
  return <div className={cn("grid min-h-64 items-center gap-6 border-y border-line py-10 sm:grid-cols-[6rem_minmax(0,1fr)] sm:gap-8 sm:py-14", className)}>
    <div aria-hidden="true" className="relative flex h-20 w-20 items-center justify-center border border-line-strong bg-surface before:absolute before:-inset-1 before:-z-10 before:-rotate-6 before:border before:border-line"><Icon className="h-7 w-7 text-accent-dark" strokeWidth={1.3} /><span className="absolute -bottom-1 -end-1 h-3 w-3 bg-accent" /></div>
    <div><h2 className="max-w-lg font-display text-2xl leading-tight tracking-tight">{title}</h2><p className="mt-3 max-w-lg text-sm leading-relaxed text-ink-soft">{description}</p>{(actionLabel || secondaryActionLabel) && <div className="mt-6 flex flex-wrap gap-3">{actionLabel && actionHref && <Link href={actionHref} className={buttonStyles({ size: "sm" })}>{actionLabel}<ArrowRight className="h-3.5 w-3.5" /></Link>}{actionLabel && !actionHref && onAction && <Button size="sm" onClick={onAction}>{actionLabel}<ArrowRight className="h-3.5 w-3.5" /></Button>}{secondaryActionLabel && secondaryActionHref && <Link href={secondaryActionHref} className={buttonStyles({ variant: "ghost", size: "sm" })}>{secondaryActionLabel}</Link>}</div>}</div>
  </div>;
}
