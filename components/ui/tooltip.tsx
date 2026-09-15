"use client";

import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Small, dependency-free tooltip for icon-first controls. The trigger keeps
 * its native semantics while the label is also exposed through
 * aria-describedby for keyboard and assistive-technology users.
 */
export function Tooltip({
  content,
  children,
  side = "bottom",
  className,
}: {
  content: string;
  children: ReactElement;
  side?: "top" | "bottom";
  className?: string;
}) {
  const tooltipId = useId();
  const describedBy = typeof children.props === "object" && children.props !== null && "aria-describedby" in children.props
    ? String((children.props as { "aria-describedby"?: string })["aria-describedby"] ?? "")
    : "";
  const trigger = isValidElement(children)
    ? cloneElement(children, {
        "aria-describedby": [describedBy, tooltipId].filter(Boolean).join(" "),
      } as Partial<typeof children.props>)
    : children;

  return (
    <span className={cn("group/tooltip relative inline-flex", className)}>
      {trigger}
      <span
        id={tooltipId}
        role="tooltip"
        className={cn(
          "pointer-events-none absolute z-50 w-max max-w-56 rounded-control bg-action px-2 py-1 text-[0.6875rem] font-medium text-action-foreground opacity-0 shadow-card transition-opacity duration-150 group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100",
          side === "top" ? "bottom-full mb-2" : "top-full mt-2",
          "start-1/2 -translate-x-1/2"
        )}
      >
        {content}
      </span>
    </span>
  );
}

export function TooltipText({ content, children }: { content: string; children: ReactNode }) {
  return <Tooltip content={content}>{<span tabIndex={0}>{children}</span>}</Tooltip>;
}
