"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, Check, Inbox, Loader2 } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface NotificationItem {
  id: string;
  title: string;
  message: string | null;
  href: string | null;
  readAt: string | null;
  createdAt: string;
}

export function NotificationMenu({ initialUnreadCount }: { initialUnreadCount: number }) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [retry, setRetry] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);

  useEffect(() => setUnreadCount(initialUnreadCount), [initialUnreadCount]);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 639px)");
    const update = () => setMobile(query.matches);
    update(); query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    void fetch("/api/notifications", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Couldn't load notifications.");
        return response.json() as Promise<{ notifications: NotificationItem[]; unreadCount: number }>;
      })
      .then((data) => {
        if (!controller.signal.aborted) { setItems(data.notifications); setUnreadCount(data.unreadCount); }
      })
      .catch((caught) => {
        if (!(caught instanceof DOMException && caught.name === "AbortError")) setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [open, retry]);

  useEffect(() => {
    if (!open || mobile) return;
    panelRef.current?.focus();
    function closeMenu(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") { setOpen(false); triggerRef.current?.focus(); }
    }
    document.addEventListener("mousedown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open, mobile]);

  async function openNotification(item: NotificationItem) {
    if (!item.readAt) {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      });
      if (response.ok) {
        setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, readAt: new Date().toISOString() } : entry));
        setUnreadCount((current) => Math.max(0, current - 1));
      }
    }

    setOpen(false);
    const target = item.href ?? "/notifications";
    const separator = target.includes("?") ? "&" : "?";
    router.push(`${target}${separator}notification=${item.id}`);
    router.refresh();
  }

  async function markAllRead() {
    const response = await fetch("/api/notifications", { method: "PATCH" });
    if (!response.ok) return;
    const readAt = new Date().toISOString();
    setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? readAt })));
    setUnreadCount(0);
    router.refresh();
  }

  const panel = (
        <div ref={panelRef} role={mobile ? undefined : "dialog"} aria-label={mobile ? undefined : "Notifications"} tabIndex={mobile ? undefined : -1} className={mobile ? "-mx-5 overflow-hidden" : "absolute end-0 top-14 z-50 max-h-[calc(100dvh-7rem)] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto overscroll-contain rounded-panel border border-line bg-surface shadow-dialog"}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
            <div className="min-w-0">
              {!mobile && <p className="font-display text-base text-ink">Notifications</p>}
              <p className="text-xs text-ink-faint">{unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}</p>
            </div>
            {unreadCount > 0 && (
              <button type="button" onClick={() => void markAllRead()} className="inline-flex min-h-11 items-center gap-1 rounded-control px-2 text-xs font-medium text-accent-dark hover:underline">
                <Check className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[50dvh] overflow-y-auto overscroll-contain p-2 sm:max-h-80">
            {loading ? (
              <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-ink-soft"><Loader2 className="h-4 w-4 animate-spin" /> Loading notifications…</div>
            ) : error ? (
              <div className="space-y-3 px-4 py-8 text-center"><p role="alert" className="text-sm text-danger">Notifications could not be loaded.</p><Button type="button" variant="outline" size="sm" onClick={() => setRetry(value => value + 1)}>Try again</Button></div>
            ) : items.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Inbox className="mx-auto h-6 w-6 text-ink-faint" />
                <p className="mt-2 text-sm font-medium text-ink">No notifications</p>
                <p className="mt-1 text-xs text-ink-faint">Sharing and feedback updates will appear here.</p>
              </div>
            ) : (
              items.map((item) => (
                <button key={item.id} type="button" onClick={() => void openNotification(item)} className={`relative block min-h-11 w-full rounded-control px-3 py-3 text-start [overflow-wrap:anywhere] transition-colors hover:bg-ink/5 ${item.readAt ? "" : "bg-accent-soft/25"}`}>
                  {!item.readAt && <span className="absolute end-3 top-3.5 h-2 w-2 rounded-full bg-accent" aria-hidden="true" />}
                  <p className="pe-5 text-sm font-medium text-ink">{item.title}</p>{!item.readAt && <span className="sr-only">Unread. </span>}
                  {item.message && <p className="mt-0.5 line-clamp-2 text-xs text-ink-soft">{item.message}</p>}
                  <p className="mt-1 text-[11px] text-ink-faint">{formatRelativeTime(item.createdAt)}</p>
                </button>
              ))
            )}
          </div>

          <Link href="/notifications" onClick={() => setOpen(false)} className="block min-h-11 border-t border-line px-4 py-3 text-center text-sm font-medium text-ink hover:bg-ink/5">
            View all notifications
          </Link>
        </div>
  );
  return <div ref={menuRef} className="relative">
    <button ref={triggerRef} type="button" onClick={() => setOpen(current => !current)} aria-label={`${unreadCount} unread notifications`} aria-haspopup="dialog" aria-expanded={open} className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-colors ${unreadCount > 0 ? "border-danger/40 bg-danger/10 text-danger" : "border-line bg-surface text-ink-soft hover:text-ink"}`}>
      <Bell className="h-4 w-4" aria-hidden="true" />{unreadCount > 0 && <span className="absolute -end-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-paper bg-danger" aria-hidden="true" />}
    </button>
    {mobile ? <Dialog open={open} onOpenChange={setOpen} title="Notifications" placement="side">{panel}</Dialog> : open && panel}
  </div>;
}
