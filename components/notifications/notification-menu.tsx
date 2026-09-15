"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, Check, Inbox, Loader2 } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

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
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);

  useEffect(() => setUnreadCount(initialUnreadCount), [initialUnreadCount]);

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
        setItems(data.notifications);
        setUnreadCount(data.unreadCount);
      })
      .catch((caught) => {
        if (!(caught instanceof DOMException && caught.name === "AbortError")) setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [open]);

  useEffect(() => {
    function closeMenu(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

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

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={`${unreadCount} unread notifications`}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`relative flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${unreadCount > 0 ? "border-danger/40 bg-danger/10 text-danger" : "border-line bg-surface text-ink-soft hover:text-ink"}`}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && <span className="absolute -end-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-paper bg-danger" aria-hidden="true" />}
      </button>

      {open && (
        <div role="menu" className="absolute end-0 top-11 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-line bg-surface shadow-card-hover">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div>
              <p className="font-display text-base text-ink">Notifications</p>
              <p className="text-xs text-ink-faint">{unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}</p>
            </div>
            {unreadCount > 0 && (
              <button type="button" onClick={() => void markAllRead()} className="inline-flex items-center gap-1 text-xs font-medium text-accent-dark hover:underline">
                <Check className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto p-2">
            {loading ? (
              <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-ink-soft"><Loader2 className="h-4 w-4 animate-spin" /> Loading notifications…</div>
            ) : error ? (
              <div className="px-4 py-10 text-center text-sm text-danger">Notifications could not be loaded. Try again.</div>
            ) : items.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Inbox className="mx-auto h-6 w-6 text-ink-faint" />
                <p className="mt-2 text-sm font-medium text-ink">No notifications</p>
                <p className="mt-1 text-xs text-ink-faint">Sharing and feedback updates will appear here.</p>
              </div>
            ) : (
              items.map((item) => (
                <button key={item.id} type="button" role="menuitem" onClick={() => void openNotification(item)} className={`relative block w-full rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-ink/5 ${item.readAt ? "" : "bg-accent-soft/25"}`}>
                  {!item.readAt && <span className="absolute end-3 top-3.5 h-2 w-2 rounded-full bg-accent" aria-hidden="true" />}
                  <p className="pe-5 text-sm font-medium text-ink">{item.title}</p>
                  {item.message && <p className="mt-0.5 line-clamp-2 text-xs text-ink-soft">{item.message}</p>}
                  <p className="mt-1 text-[11px] text-ink-faint">{formatRelativeTime(item.createdAt)}</p>
                </button>
              ))
            )}
          </div>

          <Link href="/notifications" onClick={() => setOpen(false)} className="block border-t border-line px-4 py-3 text-center text-sm font-medium text-ink hover:bg-ink/5">
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
