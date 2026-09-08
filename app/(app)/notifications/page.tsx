import { Bell } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { EmptyState } from "@/components/ui/empty-state";
import { MarkNotificationsRead } from "@/components/notifications/mark-read";
import { NotificationLink } from "@/components/notifications/notification-link";

export default async function NotificationsPage() {
  const user = await requireUser();
  const notifications = await prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 100 });
  return <div className="mx-auto max-w-3xl"><div className="flex items-center justify-between"><div><h1 className="font-display text-2xl text-ink">Notifications</h1><p className="mt-1 text-sm text-ink-soft">Sharing and feedback activity.</p></div>{notifications.some((item) => !item.readAt) && <MarkNotificationsRead />}</div>{notifications.length === 0 ? <div className="mt-8"><EmptyState icon={Bell} title="No notifications yet." description="Book sharing and feedback will appear here." /></div> : <div className="mt-6 space-y-2">{notifications.map((item) => <NotificationLink key={item.id} item={{ ...item, createdAt: item.createdAt.toISOString(), readAt: item.readAt?.toISOString() ?? null }} />)}</div>}</div>;
}
