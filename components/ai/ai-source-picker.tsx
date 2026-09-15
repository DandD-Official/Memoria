"use client";

import { useId } from "react";
import { KeyRound, Server } from "lucide-react";
import { cn } from "@/lib/utils";

export type AiKeySource = "system" | "personal";

export function AiSourcePicker({
  value,
  onChange,
  systemAvailable,
}: {
  value: AiKeySource;
  onChange: (value: AiKeySource) => void;
  systemAvailable: boolean;
}) {
  const groupId = useId();
  const options: Array<{ value: AiKeySource; label: string; description: string; icon: typeof Server; disabled?: boolean }> = [
    { value: "system", label: "Memoria AI", description: systemAvailable ? "Use the app's shared key" : "Not configured by the administrator", icon: Server, disabled: !systemAvailable },
    { value: "personal", label: "Your connected keys", description: "Try your saved keys in order", icon: KeyRound },
  ];

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-ink">Generate with</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const Icon = option.icon;
          const checked = value === option.value;
          return (
            <label key={option.value} className={cn("flex cursor-pointer items-start gap-3 rounded-control border p-3 transition-[border-color,background-color,box-shadow] duration-150", checked ? "border-accent bg-accent-soft/30 shadow-sm" : "border-line bg-surface hover:border-accent/60", option.disabled && "cursor-not-allowed opacity-60")}>
              <input type="radio" name={groupId} value={option.value} checked={checked} disabled={option.disabled} onChange={() => onChange(option.value)} className="mt-0.5 accent-accent" />
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-sm font-medium text-ink"><Icon className="h-4 w-4 text-accent-dark" aria-hidden="true" /> {option.label}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-ink-soft">{option.description}</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
