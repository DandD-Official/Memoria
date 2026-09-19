"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LogOut, Search, Settings, ArrowUpRight, LineChart } from "lucide-react";
import Link from "next/link";
import { Brand } from "@/components/layout/brand";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { NotificationMenu } from "@/components/notifications/notification-menu";
import { CreateMenu } from "@/components/layout/create-menu";
import { CommandSearch } from "@/components/layout/command-search";
import { primaryNavigation, isNavigationItemActive } from "@/components/layout/navigation";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Topbar({ userName, unreadNotifications, studyStreak }: { userName: string; unreadNotifications: number; studyStreak: number }) {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  return <>
    <header className="workspace-header">
      <div className="mx-auto flex min-h-[76px] max-w-[1400px] items-center gap-3 px-page lg:gap-8">
        <Brand href="/dashboard" compact />
        <nav aria-label="Main navigation" className="hidden self-stretch lg:flex">
          {primaryNavigation.map(item => <Link key={item.href} href={item.href} aria-current={isNavigationItemActive(pathname, item.href) ? "page" : undefined} className={cn("top-nav-link", isNavigationItemActive(pathname, item.href) && "is-active")}>{item.label}</Link>)}
        </nav>
        <div className="ms-auto flex items-center gap-1.5 sm:gap-3">
          <button type="button" onClick={() => setSearchOpen(true)} className="search-trigger" aria-label="Search library, Control or Command K"><Search className="h-4 w-4" /><span className="hidden xl:inline">Find something</span><kbd className="hidden rounded border border-line px-1.5 text-[11px] xl:inline">⌘ K</kbd></button>
          <CreateMenu />
          <NotificationMenu initialUnreadCount={unreadNotifications} />
          <button type="button" onClick={() => setAccountOpen(true)} aria-label="Open your account" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line-strong bg-surface-muted text-sm font-semibold">{userName.slice(0, 1).toUpperCase()}</button>
        </div>
      </div>
    </header>
    <CommandSearch open={searchOpen} onOpenChange={setSearchOpen} />
    <Sheet open={accountOpen} onOpenChange={setAccountOpen} title={userName} description="Your personal learning space.">
      <div className="divide-y divide-line">
        <div className="flex items-center justify-between py-5"><span className="text-sm">Appearance</span><ThemeToggle /></div>
        <Link onClick={() => setAccountOpen(false)} href="/progress" className="flex min-h-14 items-center gap-3 text-sm"><LineChart className="h-4 w-4" />Learning progress<span className="ms-auto text-xs text-ink-faint">{studyStreak > 0 ? `${studyStreak}-day review streak` : ""}</span></Link>
        <Link onClick={() => setAccountOpen(false)} href="/settings" className="flex min-h-14 items-center gap-3 text-sm"><Settings className="h-4 w-4" />Preferences & account<ArrowUpRight className="ms-auto h-4 w-4" /></Link>
        <div className="pt-5"><Button variant="ghost" loading={signingOut} onClick={async () => { setSigningOut(true); try { await signOut({ callbackUrl: "/" }); } finally { setSigningOut(false); } }}><LogOut className="h-4 w-4" />Sign out</Button></div>
      </div>
    </Sheet>
  </>;
}
