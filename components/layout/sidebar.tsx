"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookMarked, LayoutDashboard, FileText, Layers, ListChecks, GraduationCap, Share2, Settings, Bell, Archive, PanelLeftClose, PanelLeftOpen, Workflow } from "lucide-react";
import { cn } from "@/lib/utils";

const topLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
];

const memoryLinks = [
  { href: "/notes", label: "Notes", icon: FileText },
  { href: "/reviewers", label: "Reviewers", icon: Layers },
  { href: "/quizzes", label: "Quizzes", icon: ListChecks },
  { href: "/diagrams", label: "Diagrams", icon: Workflow },
];

const utilityLinks = [
  { href: "/study", label: "Study", icon: GraduationCap },
  { href: "/archive", label: "Archive", icon: Archive },
  { href: "/shared", label: "Shared with Me", icon: Share2 },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];

type SidebarMode = "HOVER" | "MANUAL";

export function Sidebar({ mode, initialCollapsed }: { mode: SidebarMode; initialCollapsed: boolean }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const hoverMode = mode === "HOVER";
  const labelsHidden = !hoverMode && collapsed;

  function announceSidebarState(isCollapsed: boolean) {
    window.dispatchEvent(new CustomEvent("memoria:sidebar-state", { detail: { collapsed: isCollapsed } }));
  }

  async function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    announceSidebarState(next);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sidebarCollapsed: next }),
    }).catch(() => {});
  }

  const renderLink = (link: (typeof topLinks)[number]) => {
    const active = pathname === link.href || pathname.startsWith(link.href + "/");
    return <Link
      key={link.href}
      href={link.href}
      className={cn(
        "flex h-9 items-center gap-3 overflow-hidden rounded-lg px-3 text-sm font-medium transition-colors",
        labelsHidden && "justify-center px-0",
        active ? "bg-action text-action-foreground" : "text-ink-soft hover:bg-ink/5 hover:text-ink"
      )}
      title={labelsHidden ? link.label : undefined}
    >
      <link.icon className="h-4 w-4 shrink-0" />
      <span className={cn("whitespace-nowrap transition-opacity", labelsHidden && "sr-only", hoverMode && "opacity-0 group-hover/sidebar:opacity-100")}>{link.label}</span>
    </Link>;
  };

  return (
    <div className={cn(
      "hidden shrink-0 lg:block",
      hoverMode ? "w-0" : ["sticky top-0 h-screen self-start", collapsed ? "w-16" : "w-60"]
    )}>
      <aside className={cn(
        "group/sidebar relative flex shrink-0 flex-col border-r border-line bg-surface transition-[width] duration-200",
        hoverMode ? "fixed inset-y-0 left-0 z-50 h-screen w-2 overflow-hidden shadow-card-hover hover:w-60" : "h-full",
        !hoverMode && (collapsed ? "w-16" : "w-60")
      )}
        onMouseEnter={hoverMode ? () => announceSidebarState(false) : undefined}
        onMouseLeave={hoverMode ? () => announceSidebarState(true) : undefined}
      >
        <div className={cn("flex h-16 shrink-0 items-center border-b border-line px-3", labelsHidden ? "justify-center" : "justify-start", hoverMode && "min-w-60")}>
          <div className={cn("flex items-center gap-2 overflow-hidden font-display text-lg text-ink", labelsHidden && "invisible", hoverMode && "opacity-0 transition-opacity group-hover/sidebar:opacity-100")}>
            <BookMarked className="h-5 w-5 shrink-0 text-accent-dark" />
            <span className="whitespace-nowrap">Memoria</span>
          </div>
        </div>
        {!hoverMode && <button type="button" onClick={() => void toggleCollapsed()} aria-label={collapsed ? "Open sidebar" : "Collapse sidebar"} aria-expanded={!collapsed} className="absolute -right-4 top-1/2 z-10 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface text-ink-soft shadow-card hover:border-accent hover:bg-accent-soft hover:text-ink">{collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}</button>}
        <nav className={cn("min-h-0 min-w-0 flex-1 overflow-y-auto py-3", labelsHidden ? "px-2" : "px-3", hoverMode && "min-w-60 px-3")}>
          <div className="space-y-0.5">{topLinks.map(renderLink)}</div>
          <div className="mt-4">
            <p className={cn("mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-ink-faint", labelsHidden && "sr-only", hoverMode && "opacity-0 transition-opacity group-hover/sidebar:opacity-100")}>Memories</p>
            <div className="space-y-0.5">{memoryLinks.map(renderLink)}</div>
          </div>
          <div className="mt-4 space-y-0.5 border-t border-line pt-4">{utilityLinks.map(renderLink)}</div>
        </nav>
      </aside>
    </div>
  );
}
