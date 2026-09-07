import type { ReactNode } from "react";
import { AlertOctagon, AlertTriangle, CheckCircle2, Info, Lightbulb } from "lucide-react";
import type { MmdBlockNode } from "@/lib/mmd/ast";
import { cn } from "@/lib/utils";

type CalloutVariant = "note" | "tip" | "warning" | "danger" | "info" | "success";

const VARIANT_CONFIG: Record<
  CalloutVariant,
  { label: string; icon: typeof Info; container: string; icon_: string }
> = {
  note: {
    label: "Note",
    icon: Info,
    container: "border-ink/10 bg-ink/[0.03]",
    icon_: "text-ink-soft",
  },
  info: {
    label: "Info",
    icon: Info,
    container: "border-accent/30 bg-accent-soft/20",
    icon_: "text-accent-dark",
  },
  tip: {
    label: "Tip",
    icon: Lightbulb,
    container: "border-accent/50 bg-accent-soft/40",
    icon_: "text-accent-dark",
  },
  success: {
    label: "Success",
    icon: CheckCircle2,
    container: "border-success/40 bg-success/10",
    icon_: "text-success",
  },
  warning: {
    label: "Warning",
    icon: AlertTriangle,
    container: "border-accent-dark/50 bg-accent-soft/60",
    icon_: "text-accent-dark",
  },
  danger: {
    label: "Danger",
    icon: AlertOctagon,
    container: "border-danger/50 bg-danger/10",
    icon_: "text-danger",
  },
};

/**
 * Renders :::note / :::tip / :::warning / :::danger / :::info / :::success.
 * `node.block` is guaranteed by the dispatcher (components/mmd/node-list.tsx)
 * to be one of the six callout names, so the lookup below is safe.
 */
export function CalloutBlock({ node, children }: { node: MmdBlockNode; children: ReactNode }) {
  const variant = node.block as CalloutVariant;
  const config = VARIANT_CONFIG[variant];
  const Icon = config.icon;
  const title = node.attrs.title;

  return (
    <div className={cn("my-4 rounded-lg border p-4", config.container)}>
      <div className="flex items-start gap-2.5">
        <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", config.icon_)} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className={cn("text-xs font-semibold uppercase tracking-wide", config.icon_)}>
            {title || config.label}
          </p>
          <div className="mt-1 text-sm text-ink [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
