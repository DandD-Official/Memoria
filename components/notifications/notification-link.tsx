"use client";

import { useRouter } from "next/navigation";
import { formatRelativeTime } from "@/lib/utils";

export function NotificationLink({ item }: { item: { id: string; title: string; message: string | null; href: string | null; readAt: string | null; createdAt: string } }) {
  const router = useRouter();
  return <button type="button" onClick={async () => {
    if (!item.readAt) await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id }) });
    const target = item.href ?? "/notifications";
    const separator = target.includes("?") ? "&" : "?";
    router.push(`${target}${separator}notification=${item.id}`);
    router.refresh();
  }} className={`card block w-full p-4 text-start [overflow-wrap:anywhere] transition-colors hover:border-accent/50 ${item.readAt ? "" : "border-accent/50 bg-accent-soft/20"}`}>
    <p className="text-sm font-medium text-ink">{item.title}</p>{item.message && <p className="mt-1 text-sm text-ink-soft">{item.message}</p>}<p className="mt-1 text-xs text-ink-faint">{formatRelativeTime(new Date(item.createdAt))}</p>
  </button>;
}
