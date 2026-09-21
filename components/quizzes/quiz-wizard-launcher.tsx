"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

const QuizWizard = dynamic(
  () => import("@/components/quizzes/quiz-wizard").then((module) => module.QuizWizard),
  { loading: () => <Button loading>Loading creator</Button> }
);

export function QuizWizardLauncher({
  notes,
  reviewers,
  defaultNoteId,
  defaultReviewerId,
  initiallyOpen = false,
  initialMode = "existing",
  defaults,
  systemAvailable = false,
}: {
  notes: Array<{ id: string; title: string }>;
  reviewers: Array<{ id: string; title: string }>;
  defaultNoteId?: string;
  defaultReviewerId?: string;
  initiallyOpen?: boolean;
  initialMode?: "existing" | "import";
  defaults: { questionCount: number; difficulty: "EASY" | "NORMAL" | "HARD" | "MIXED"; mode: "QUIZ" | "PRACTICE_EXAM" | "MOCK_EXAM" | "TIMED_EXAM" | "MASTERY_TEST" };
  systemAvailable?: boolean;
}) {
  const router = useRouter();
  const requested = Boolean(defaultNoteId || defaultReviewerId) || initiallyOpen;

  if (!requested) {
    return <Button onClick={() => router.push("/quizzes?create=1")}><Plus className="h-4 w-4" /> Create quiz</Button>;
  }
  return <QuizWizard notes={notes} reviewers={reviewers} defaultNoteId={defaultNoteId} defaultReviewerId={defaultReviewerId} defaults={defaults} initiallyOpen initialMode={initialMode} systemAvailable={systemAvailable} />;
}
