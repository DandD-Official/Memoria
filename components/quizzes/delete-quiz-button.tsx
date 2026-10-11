"use client";

import { useRouter } from "@/components/layout/navigation-loading";
import { Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function DeleteQuizButton({ quizId }: { quizId: string }) {
  const router = useRouter();

  async function handleDelete() {
    await fetch(`/api/quizzes/${quizId}`, { method: "DELETE" });
    router.push("/quizzes");
  }

  return (
    <ConfirmDialog
      trigger={
        <button className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-3 text-sm text-danger hover:bg-danger/5">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      }
      title="Delete this quiz?"
      description="Your past attempts and results for this quiz will also be removed."
      confirmLabel="Delete"
      destructive
      onConfirm={handleDelete}
    />
  );
}
