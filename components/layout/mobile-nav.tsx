"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { mobilePrimaryNavigation, mobileMoreNavigation, isNavigationItemActive } from "@/components/layout/navigation";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export function MobileNav({ unreadNotifications }: { unreadNotifications: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return <>
    <nav aria-label="Mobile navigation" className="mobile-dock">
      {mobilePrimaryNavigation.map(item => <Link key={item.href} href={item.href} aria-current={isNavigationItemActive(pathname, item.href) ? "page" : undefined} className={cn("flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-[11px]", isNavigationItemActive(pathname, item.href) ? "font-semibold text-action" : "text-ink-soft")}><item.icon className="h-5 w-5" />{item.label}</Link>)}
      <button type="button" aria-label="Open more navigation" aria-expanded={open} onClick={() => setOpen(true)} className="flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-[11px] text-ink-soft"><Menu className="h-5 w-5" />More</button>
    </nav>
    <Sheet open={open} onOpenChange={setOpen} title="Find your way" description="Everything in your learning space."><nav aria-label="All pages" className="grid gap-1">{mobileMoreNavigation.map(item => <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="flex min-h-12 items-center gap-3 rounded-control px-3 text-sm hover:bg-surface-muted"><item.icon className="h-4 w-4 text-ink-soft" />{item.label}{item.href === "/notifications" && unreadNotifications > 0 && <span className="ms-auto rounded-full bg-accent-soft px-2 text-xs">{unreadNotifications} unread</span>}</Link>)}</nav></Sheet>
  </>;
}
