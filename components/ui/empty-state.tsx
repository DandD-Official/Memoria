import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Button, buttonStyles } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
  secondaryActionLabel?: string;
  secondaryActionHref?: string;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction, actionHref, secondaryActionLabel, secondaryActionHref, className }: EmptyStateProps) {
  const hasPrimaryAction = Boolean(actionLabel && (actionHref || onAction));
  const hasSecondaryAction = Boolean(secondaryActionLabel && secondaryActionHref);

  return (
    <div className={cn("relative flex min-h-64 flex-col items-center justify-center overflow-hidden rounded-panel border border-dashed border-line-strong bg-surface-muted px-5 py-12 text-center sm:px-8 sm:py-16", className)}>
      <div className="pointer-events-none absolute inset-x-1/4 -top-20 h-40 rounded-full bg-accent-soft/45 blur-3xl" aria-hidden="true" />
      <div className="relative mb-4 flex h-12 w-12 items-center justify-center rounded-card border border-accent/20 bg-accent-soft shadow-sm">
        <Icon className="h-6 w-6 text-accent-dark" aria-hidden="true" />
      </div>
      <h3 className="relative font-display text-xl font-medium text-ink">{title}</h3>
      <p className="relative mt-2 max-w-md text-sm leading-relaxed text-ink-soft">{description}</p>
      {(hasPrimaryAction || hasSecondaryAction) && (
        <div className="relative mt-5 flex w-full flex-col justify-center gap-2 sm:w-auto sm:flex-row">
          {actionLabel && actionHref && <Link href={actionHref} className={buttonStyles({ size: "sm" })}>{actionLabel}</Link>}
          {actionLabel && !actionHref && onAction && <Button size="sm" onClick={onAction}>{actionLabel}</Button>}
          {secondaryActionLabel && secondaryActionHref && <Link href={secondaryActionHref} className={buttonStyles({ variant: "outline", size: "sm" })}>{secondaryActionLabel}</Link>}
        </div>
      )}
    </div>
  );
}
