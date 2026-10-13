"use client";

import { useRouter } from "@/components/layout/navigation-loading";
import { Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function DeleteReviewerButton({ reviewerId }: { reviewerId: string }) {
  const router = useRouter();

  async function handleDelete() {
    await fetch(`/api/reviewers/${reviewerId}`, { method: "DELETE" });
    router.push("/reviewers");
  }

  return (
    <ConfirmDialog
      trigger={
        <button className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-3 text-sm text-danger hover:bg-danger/5">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      }
      title="Delete this reviewer?"
      description="This can't be undone. Quizzes built from it will keep their own content."
      confirmLabel="Delete"
      destructive
      onConfirm={handleDelete}
    />
  );
}
