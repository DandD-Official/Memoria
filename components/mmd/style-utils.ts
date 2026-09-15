import { cn } from "@/lib/utils";

/** Maps the deliberately small MMD presentation vocabulary to fixed classes.
 * Authors can make their blocks feel personal without injecting arbitrary CSS. */
export function mmdPresentationClass(attrs: Record<string, string>): string {
  return cn(
    attrs.textStyle === "display" && "mmd-text-display",
    attrs.textStyle === "muted" && "mmd-text-muted",
    attrs.textStyle === "strong" && "mmd-text-strong",
    attrs.align === "center" && "text-center",
    attrs.align === "right" && "text-end",
    attrs.size === "compact" && "mmd-size-compact",
    attrs.size === "spacious" && "mmd-size-spacious",
    attrs.gradient && attrs.gradient !== "none" && `mmd-gradient-${attrs.gradient}`,
    attrs.hover === "lift" && "mmd-hover-lift",
    attrs.animation === "fade" && "mmd-animation-fade"
  );
}
