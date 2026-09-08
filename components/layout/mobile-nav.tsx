"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { isNavigationItemActive, mobileMoreNavigation, mobilePrimaryNavigation } from "@/components/layout/navigation";

export function MobileNav({ unreadNotifications = 0 }: { unreadNotifications?: number }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = mobileMoreNavigation.some((item) => isNavigationItemActive(pathname, item.href));

  return (
    <>
      <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgb(var(--color-ink)/0.05)] backdrop-blur lg:hidden">
        {mobilePrimaryNavigation.map((item) => {
          const active = isNavigationItemActive(pathname, item.href);
          return (
            <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={cn("relative flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[0.6875rem] font-medium transition-colors", active ? "text-ink" : "text-ink-faint")}>
              {active && <span className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-accent" aria-hidden="true" />}
              <item.icon className={cn("h-5 w-5", active && "text-accent-dark")} aria-hidden="true" />
              <span className="max-w-full truncate">{item.shortLabel ?? item.label}</span>
            </Link>
          );
        })}
        <button type="button" onClick={() => setMoreOpen(true)} aria-current={moreActive ? "page" : undefined} aria-haspopup="dialog" aria-expanded={moreOpen} className={cn("relative flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[0.6875rem] font-medium transition-colors", moreActive ? "text-ink" : "text-ink-faint")}>
          {moreActive && <span className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-accent" aria-hidden="true" />}
          <Menu className={cn("h-5 w-5", moreActive && "text-accent-dark")} aria-hidden="true" />
          <span>More</span>
        </button>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen} title="Explore Memoria" description="Every part of your workspace is within reach.">
        <nav aria-label="More destinations" className="grid grid-cols-2 gap-2">
          {mobileMoreNavigation.map((item) => {
            const active = isNavigationItemActive(pathname, item.href);
            const notificationCount = item.href === "/notifications" ? unreadNotifications : 0;
            return (
              <Link key={item.href} href={item.href} onClick={() => setMoreOpen(false)} aria-current={active ? "page" : undefined} className={cn("relative flex min-h-20 items-center gap-3 rounded-card border p-3 text-sm font-medium transition-colors", active ? "border-accent bg-accent-soft text-ink" : "border-line bg-surface text-ink-soft hover:border-line-strong hover:bg-surface-muted hover:text-ink")}>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-ink/5"><item.icon className="h-[1.125rem] w-[1.125rem]" aria-hidden="true" /></span>
                <span>{item.label}</span>
                {notificationCount > 0 && <span className="absolute right-2 top-2 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[0.625rem] font-semibold text-white" aria-label={`${notificationCount} unread`}>{Math.min(notificationCount, 99)}</span>}
              </Link>
            );
          })}
        </nav>
      </Sheet>
    </>
  );
}
