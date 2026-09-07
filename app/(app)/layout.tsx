import { requireUser } from "@/lib/auth/session";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Topbar } from "@/components/layout/topbar";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { SessionConflictModal } from "@/components/auth/session-conflict-modal";
import { SessionHeartbeat } from "@/components/auth/session-heartbeat";
import { calculateStudyStreak } from "@/lib/study-streak";
import { cn } from "@/lib/utils";

// This layout wraps every authenticated route (dashboard, notes, reviewers,
// quizzes, study, shared, settings — see the route groups that reuse it via
// the (app) segment). requireUser() enforces auth server-side; there is no
// client-only route guard anywhere in the app.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [unreadNotifications, account, recentReviews, settings] = await Promise.all([
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
    prisma.user.findUnique({ where: { id: user.id }, select: { onboardingCompletedAt: true } }),
    prisma.flashcardReview.findMany({
      where: { userId: user.id, reviewedAt: { gte: new Date(Date.now() - 30 * 86_400_000) } },
      select: { reviewedAt: true },
      orderBy: { reviewedAt: "desc" },
    }),
    prisma.userSettings.findUnique({ where: { userId: user.id } }),
  ]);
  if (!account?.onboardingCompletedAt) redirect("/onboarding");
  const studyStreak = calculateStudyStreak(recentReviews.map((review) => review.reviewedAt));
  const userSettings = settings ?? { sidebarMode: "MANUAL", sidebarCollapsed: false, compactLayout: false, reduceMotion: false };

  return (
    <div className={cn("flex min-h-screen bg-paper", userSettings.reduceMotion && "reduce-motion", userSettings.compactLayout && "compact-layout")}>
      <Sidebar mode={userSettings.sidebarMode === "HOVER" ? "HOVER" : "MANUAL"} initialCollapsed={userSettings.sidebarCollapsed} />
      <div className="flex min-w-0 flex-1 flex-col overflow-x-clip pb-16 lg:pb-0">
        <Topbar userName={user.name ?? user.email ?? "Account"} unreadNotifications={unreadNotifications} studyStreak={studyStreak} showBrandInitially={userSettings.sidebarMode === "HOVER" || userSettings.sidebarCollapsed} />
        <main className={cn("min-w-0 flex-1 px-page", userSettings.compactLayout ? "py-4" : "py-6")}>
          {children}
        </main>
      </div>
      <MobileNav />
      <SessionHeartbeat />
      {user.sessionConflict && user.sessionId && <SessionConflictModal userName={user.name ?? user.email ?? "This account"} sessionId={user.sessionId} otherDevice={user.sessionConflictDevice} currentDevice={user.currentSessionDevice} />}
    </div>
  );
}
