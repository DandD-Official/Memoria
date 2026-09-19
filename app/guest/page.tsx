"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { PageDescription, PageHeader, PageHeaderContent, PageShell, PageTitle } from "@/components/ui/page";

const GuestReviewerFlow = dynamic(
  () => import("@/components/guest/guest-reviewer-flow").then((module) => module.GuestReviewerFlow),
  { loading: () => <ActivityLoading /> }
);
const GuestQuizFlow = dynamic(
  () => import("@/components/guest/guest-quiz-flow").then((module) => module.GuestQuizFlow),
  { loading: () => <ActivityLoading /> }
);

export default function GuestPage() {
  const [tab, setTab] = useState<"reviewer" | "flashcards" | "quiz" | "exam">("reviewer");
  const [visited, setVisited] = useState<string[]>(["reviewer"]);

  const activities = [
    { key: "reviewer" as const, label: "Study guide" },
    { key: "flashcards" as const, label: "Flashcards" },
    { key: "quiz" as const, label: "Quiz" },
    { key: "exam" as const, label: "Exam" },
  ];

  return (
    <PageShell className="max-w-4xl">
      <PageHeader><PageHeaderContent><p className="eyebrow">A little room to explore</p><PageTitle className="mt-3">Start with one idea.</PageTitle><PageDescription>Build a prompt for your AI assistant, bring the result back, and try a study guide or a little practice. No account needed.</PageDescription></PageHeaderContent></PageHeader>

      <div role="group" aria-label="Choose an activity" className="grid grid-cols-2 gap-2 border-b border-line pb-5 sm:grid-cols-4">
        {activities.map((activity) => (
          <button
            key={activity.key}
            type="button"
            aria-pressed={tab === activity.key}
            aria-controls={`activity-${activity.key}`}
            onClick={() => { setTab(activity.key); setVisited(previous => previous.includes(activity.key) ? previous : [...previous, activity.key]); }}
            className={cn("min-h-12 rounded-control border px-3 py-2 text-sm font-medium", tab === activity.key ? "border-action bg-action text-action-foreground" : "border-line text-ink-soft hover:bg-surface-muted")}
          >
            {activity.label}
          </button>
        ))}
      </div>

      <div>
        {activities.map(activity => <section key={activity.key} id={`activity-${activity.key}`} aria-label={activity.label} hidden={tab !== activity.key}>
          {visited.includes(activity.key) && (activity.key === "reviewer" || activity.key === "flashcards" ? <GuestReviewerFlow initialView={activity.key} /> : <GuestQuizFlow activityMode={activity.key} />)}
        </section>)}
      </div>
    </PageShell>
  );
}

function ActivityLoading() {
  return <div className="card h-48 animate-pulse bg-ink/[0.03]" role="status"><span className="sr-only">Loading activity</span></div>;
}
