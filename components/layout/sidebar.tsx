"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookMarked, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { isNavigationItemActive, navigationGroups, utilityNavigation, type NavigationItem } from "@/components/layout/navigation";

type SidebarMode = "HOVER" | "MANUAL";

export function Sidebar({ mode, initialCollapsed }: { mode: SidebarMode; initialCollapsed: boolean }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const hoverMode = mode === "HOVER";
  const labelsHidden = !hoverMode && collapsed;

  async function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    await fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sidebarCollapsed: next }) }).catch(() => {});
  }

  function renderLink(item: NavigationItem) {
    const active = isNavigationItemActive(pathname, item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        title={labelsHidden ? item.label : undefined}
        className={cn(
          "group/link relative flex min-h-10 items-center gap-3 overflow-hidden rounded-control px-3 text-sm font-medium transition-[background-color,color]",
          labelsHidden && "justify-center px-0",
          active ? "bg-action text-action-foreground shadow-sm" : "text-ink-soft hover:bg-ink/5 hover:text-ink"
        )}
      >
        <item.icon className="h-[1.125rem] w-[1.125rem] shrink-0" aria-hidden="true" />
        <span className={cn("whitespace-nowrap transition-opacity", labelsHidden && "sr-only", hoverMode && "opacity-0 group-hover/sidebar:opacity-100")}>{item.label}</span>
      </Link>
    );
  }

  return (
    <div className={cn("hidden shrink-0 lg:block", hoverMode ? "w-[4.5rem]" : ["sticky top-0 h-screen self-start transition-[width] duration-200", collapsed ? "w-[4.5rem]" : "w-64"])}>
      <aside
        className={cn(
          "group/sidebar flex h-screen shrink-0 flex-col overflow-hidden border-r border-line bg-surface/95 backdrop-blur transition-[width,box-shadow] duration-200",
          hoverMode ? "fixed inset-y-0 left-0 z-50 w-[4.5rem] hover:w-64 hover:shadow-card-hover" : ["sticky top-0", collapsed ? "w-[4.5rem]" : "w-64"]
        )}
      >
        <Link href="/dashboard" aria-label="Memoria dashboard" className={cn("flex h-16 shrink-0 items-center border-b border-line px-4", labelsHidden ? "justify-center" : "gap-2.5", hoverMode && "min-w-64")}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control border border-accent/25 bg-accent-soft text-accent-dark shadow-sm"><BookMarked className="h-5 w-5" aria-hidden="true" /></span>
          <span className={cn("whitespace-nowrap font-display text-xl font-medium text-ink transition-opacity", labelsHidden && "sr-only", hoverMode && "opacity-0 group-hover/sidebar:opacity-100")}>Memoria</span>
        </Link>

        <nav aria-label="Main navigation" className={cn("min-h-0 flex-1 overflow-y-auto py-4", labelsHidden ? "px-2.5" : "px-3", hoverMode && "min-w-64 px-3")}>
          {navigationGroups.map((group, index) => (
            <div key={group.label} className={cn(index > 0 && "mt-5 border-t border-line pt-4")}>
              <p className={cn("mb-1.5 px-3 text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-ink-faint transition-opacity", labelsHidden && "sr-only", hoverMode && "opacity-0 group-hover/sidebar:opacity-100")}>{group.label}</p>
              <div className="space-y-1">{group.items.map(renderLink)}</div>
            </div>
          ))}
        </nav>

        <div className={cn("shrink-0 border-t border-line py-3", labelsHidden ? "px-2.5" : "px-3", hoverMode && "min-w-64 px-3")}>
          <div className="space-y-1">{utilityNavigation.map(renderLink)}</div>
          {!hoverMode && (
            <button type="button" onClick={() => void toggleCollapsed()} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!collapsed} className={cn("mt-2 flex min-h-10 w-full items-center gap-3 rounded-control px-3 text-sm font-medium text-ink-faint transition-colors hover:bg-ink/5 hover:text-ink", labelsHidden && "justify-center px-0")}>
              {collapsed ? <PanelLeftOpen className="h-[1.125rem] w-[1.125rem]" /> : <PanelLeftClose className="h-[1.125rem] w-[1.125rem]" />}
              <span className={cn(labelsHidden && "sr-only")}>{collapsed ? "Expand" : "Collapse"}</span>
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}
