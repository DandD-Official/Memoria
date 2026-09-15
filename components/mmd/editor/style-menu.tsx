"use client";

import { Palette } from "lucide-react";
import { cn } from "@/lib/utils";

export type MmdStylePreset = {
  label: string;
  description: string;
  attrs: string;
};

const PRESETS: MmdStylePreset[] = [
  { label: "Memory highlight", description: "Warm gradient, strong type, gentle lift", attrs: 'textStyle="strong" gradient="memory" hover="lift" animation="fade"' },
  { label: "Study card", description: "Clear display type with a calm accent", attrs: 'textStyle="display" gradient="accent"' },
  { label: "Quiet aside", description: "Compact, muted supporting material", attrs: 'textStyle="muted" size="compact"' },
];

export function MmdStyleMenu({ onInsert, disabled }: { onInsert: (attrs: string) => void; disabled?: boolean }) {
  return (
    <details className="relative" onClick={(event) => event.stopPropagation()}>
      <summary className={cn("flex h-8 cursor-pointer list-none items-center gap-1 rounded-md px-2 text-ink-soft hover:bg-ink/5 hover:text-ink", disabled && "pointer-events-none opacity-40")}>
        <Palette className="h-4 w-4" aria-hidden="true" />
        <span className="text-xs font-medium">Style</span>
      </summary>
      <div className="absolute left-0 z-50 mt-1 w-64 rounded-lg border border-line bg-surface p-1 shadow-card-hover">
        <p className="px-2.5 py-2 text-[10px] font-semibold uppercase tracking-wide text-ink-faint">Insert a styled card</p>
        {PRESETS.map((preset) => (
          <button key={preset.label} type="button" onClick={(event) => { onInsert(preset.attrs); event.currentTarget.closest("details")?.removeAttribute("open"); }} className="block w-full rounded-md px-2.5 py-2 text-left hover:bg-accent-soft focus:bg-accent-soft focus:outline-none">
            <span className="block text-sm font-medium text-ink">{preset.label}</span>
            <span className="mt-0.5 block text-xs text-ink-faint">{preset.description}</span>
          </button>
        ))}
      </div>
    </details>
  );
}
