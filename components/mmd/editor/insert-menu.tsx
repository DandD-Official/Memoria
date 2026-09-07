"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { BLOCK_DEFS, type BlockDefinition } from "@/lib/mmd/spec-blocks";
import { INSERT_TEMPLATES } from "@/lib/mmd/editor-templates";
import { cn } from "@/lib/utils";

const CATEGORY_LABELS: Record<BlockDefinition["category"], string> = {
  callout: "Callouts",
  educational: "Educational",
  layout: "Layout",
  media: "Media",
  diagram: "Diagrams",
  ai: "AI Workflow",
};

// Fixed display order, independent of object key iteration order.
const CATEGORY_ORDER: BlockDefinition["category"][] = [
  "media",
  "diagram",
  "callout",
  "educational",
  "layout",
  "ai",
];

function humanLabel(blockName: string): string {
  return blockName
    .split("-")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

/** "column" is only ever inserted as part of "columns" (see
 * lib/mmd/editor-templates.ts) — it has no standalone menu entry. */
const HIDDEN_FROM_MENU = new Set(["column"]);

interface Group {
  category: BlockDefinition["category"];
  items: { name: string; def: BlockDefinition }[];
}

function buildGroups(): Group[] {
  const groups: Group[] = CATEGORY_ORDER.map((category) => ({ category, items: [] }));
  for (const [name, def] of Object.entries(BLOCK_DEFS)) {
    if (HIDDEN_FROM_MENU.has(name)) continue;
    const group = groups.find((g) => g.category === def.category);
    group?.items.push({ name, def });
  }
  return groups.filter((g) => g.items.length > 0);
}

const GROUPS = buildGroups();

export function MmdInsertMenu({ onInsert, disabled }: { onInsert: (blockName: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return (
    <div ref={menuRef} className="relative inline-block">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-label="Insert Memoria Markdown block"
        className="flex h-8 items-center gap-1 rounded-md px-2 text-ink-soft hover:bg-ink/5 hover:text-ink disabled:opacity-40"
        title="Insert Memoria Markdown block"
      >
        <Plus className="h-4 w-4" />
        <span className="text-xs font-medium">Insert</span>
        <ChevronDown className={cn("h-3 w-3 text-ink-faint transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Insert Memoria Markdown block"
          id="mmd-insert-menu"
          className="absolute left-0 z-50 mt-1 max-h-96 w-72 overflow-y-auto rounded-lg border border-line bg-surface p-1 shadow-card-hover"
        >
          {GROUPS.map((group) => (
            <div key={group.category} className="py-1">
              <p className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
                {CATEGORY_LABELS[group.category]}
              </p>
              {group.items.map(({ name, def }) => {
                const template = INSERT_TEMPLATES[name];
                const isDisabled = !template || template.disabled;
                return (
                  <button
                    key={name}
                    type="button"
                    role="menuitem"
                    disabled={isDisabled}
                    title={isDisabled ? template?.disabledReason : def.description}
                    onClick={() => {
                      setOpen(false);
                      onInsert(name);
                    }}
                    className={cn(
                      "block w-full rounded-md px-2.5 py-1.5 text-left text-sm transition-colors",
                      isDisabled
                        ? "cursor-not-allowed text-ink-faint"
                        : "text-ink hover:bg-accent-soft focus:bg-accent-soft focus:outline-none"
                    )}
                  >
                    <span className="font-medium">{humanLabel(name)}</span>
                    {!isDisabled && (
                      <span className="ml-1.5 text-xs text-ink-faint">{def.description}</span>
                    )}
                    {isDisabled && (
                      <span className="ml-1.5 text-xs italic text-ink-faint">
                        {template?.disabledReason ?? "Not available yet"}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
