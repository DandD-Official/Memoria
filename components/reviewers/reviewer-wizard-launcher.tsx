"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

const ReviewerWizard = dynamic(
  () => import("@/components/reviewers/reviewer-wizard").then((module) => module.ReviewerWizard),
  { loading: () => <Button loading>Loading creator</Button> }
);

export function ReviewerWizardLauncher({ notes, defaultNoteId, initiallyOpen = false, initialPath, systemAvailable = false }: { notes: Array<{ id: string; title: string }>; defaultNoteId?: string; initiallyOpen?: boolean; initialPath?: "notes" | "import"; systemAvailable?: boolean }) {
  const router = useRouter();
  const requested = Boolean(defaultNoteId || initialPath) || initiallyOpen;

  if (!requested) {
    return <Button onClick={() => router.push("/reviewers?create=1")}><Plus className="h-4 w-4" /> Create reviewer</Button>;
  }
  return <ReviewerWizard notes={notes} defaultNoteId={defaultNoteId} initiallyOpen initialPath={initialPath} systemAvailable={systemAvailable} />;
}
