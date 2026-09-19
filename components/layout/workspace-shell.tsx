"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, ChevronDown, PanelTop } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { libraryNavigation, togetherNavigation } from "@/components/layout/navigation";
import { Brand } from "@/components/layout/brand";
import { cn } from "@/lib/utils";

export function WorkspaceShell({ children, userName, unreadNotifications, studyStreak, compact, reduceMotion, indexCollapsed, indexMode }: { children: React.ReactNode; userName: string; unreadNotifications: number; studyStreak: number; compact: boolean; reduceMotion: boolean; indexCollapsed: boolean; indexMode: string }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(indexCollapsed);
  useEffect(() => setCollapsed(indexCollapsed), [indexCollapsed]);
  useEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", reduceMotion);
    return () => document.documentElement.classList.remove("reduce-motion");
  }, [reduceMotion]);
  const focus = /\/quizzes\/[^/]+\/play$/.test(pathname) || pathname === "/study/review" || pathname.startsWith("/study/flashcards/");
  const library = libraryNavigation.some(item => pathname === item.href);
  const reading = /^\/(notes|reviewers)\/[^/]+$/.test(pathname) && !pathname.endsWith("/import");
  return <div className={cn("workspace min-h-dvh", focus && "focus-workspace", compact && "compact-layout", reduceMotion && "reduce-motion")}>
    <a href="#main-content" className="skip-link">Skip to content</a>
    {focus ? <header className="focus-header"><Link href="/study" className="inline-flex min-h-11 items-center gap-2 text-sm text-ink-soft"><ArrowLeft className="h-4 w-4" /> Leave focus</Link><Brand href="/dashboard" compact /><span className="hidden font-mono text-xs uppercase tracking-widest text-ink-faint sm:block">One thing at a time</span></header> : <Topbar userName={userName} unreadNotifications={unreadNotifications} studyStreak={studyStreak} />}
    {!focus && library && <div className="context-index" onMouseEnter={() => { if (indexMode === "HOVER") setCollapsed(false); }} onMouseLeave={() => { if (indexMode === "HOVER" && indexCollapsed) setCollapsed(true); }}>
      <div className="mx-auto flex max-w-[1400px] items-start gap-3 px-page">
        <button type="button" aria-label={collapsed ? "Expand library navigation" : "Collapse library navigation"} aria-expanded={!collapsed} onClick={() => setCollapsed(!collapsed)} className="inline-flex min-h-14 shrink-0 items-center gap-2 text-xs text-ink-soft"><PanelTop className="h-4 w-4" /><span className="hidden md:inline">Library index</span><ChevronDown className={cn("h-3 w-3", !collapsed && "rotate-180")} /></button>
        {!collapsed && <nav aria-label="Library" className="flex flex-1 flex-wrap gap-x-1 py-2">{libraryNavigation.map(item => <Link key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : undefined} className={cn("inline-flex min-h-10 items-center gap-1.5 rounded-control px-3 text-xs", pathname === item.href ? "bg-accent-soft font-semibold text-ink" : "text-ink-soft hover:bg-surface-muted")}><item.icon className="h-3.5 w-3.5" />{item.label}</Link>)}</nav>}
      </div>
    </div>}
    {!focus && togetherNavigation.some(item => pathname === item.href || pathname.startsWith(`${item.href}/`)) && <div className="context-index"><nav aria-label="Together" className="mx-auto flex max-w-[1400px] flex-wrap gap-2 px-page py-2">{togetherNavigation.map(item => <Link key={item.href} href={item.href} aria-current={pathname === item.href || pathname.startsWith(`${item.href}/`) ? "page" : undefined} className={cn("inline-flex min-h-11 items-center gap-2 rounded-control px-3 text-sm", pathname === item.href || pathname.startsWith(`${item.href}/`) ? "bg-accent-soft font-semibold text-ink" : "text-ink-soft hover:bg-surface-muted")}><item.icon className="h-4 w-4" aria-hidden="true" />{item.label}</Link>)}</nav></div>}
    <main id="main-content" tabIndex={-1} className={cn("workspace-content px-page", focus ? "mx-auto max-w-5xl py-8 sm:py-12" : "mx-auto max-w-[1400px] pb-28 pt-8 sm:pt-10 lg:pb-16", reading && "reading-workspace", compact && "!pt-5")}>{children}</main>
    {!focus && <MobileNav unreadNotifications={unreadNotifications} />}
  </div>;
}
