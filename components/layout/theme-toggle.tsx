"use client";

import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme, type Appearance } from "@/components/layout/theme-provider";
import { cn } from "@/lib/utils";

const OPTIONS: { value: Appearance; icon: typeof Sun; label: string }[] = [
  { value: "LIGHT", icon: Sun, label: "Light" },
  { value: "DARK", icon: Moon, label: "Dark" },
  { value: "SYSTEM", icon: Monitor, label: "System" },
];

/**
 * Lets anyone change appearance right away, signed in or not — the
 * preference lives in localStorage (see components/layout/theme-provider.tsx)
 * and only syncs to an account when one exists.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  return (
    <div className={cn("inline-flex items-center gap-0.5 rounded-lg border border-line bg-surface p-0.5", className)}>
      {OPTIONS.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          type="button"
          aria-label={label}
          aria-pressed={theme === value}
          title={label}
          onClick={() => setTheme(value)}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
            theme === value ? "bg-action text-action-foreground" : "text-ink-faint hover:bg-ink/5 hover:text-ink"
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}
