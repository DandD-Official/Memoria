"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function DeleteCollectionButton({ id, title, kind = "BOOK", disabled, onDeleted }: {
  id: string;
  title: string;
  kind?: "BOOK" | "NOTEBOOK";
  disabled?: boolean;
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const label = kind === "NOTEBOOK" ? "notebook" : "book";

  async function handleDelete() {
    const response = await fetch(`/api/collections/${id}`, { method: "DELETE" });
    if (!response.ok) throw new Error("Deletion failed.");
    if (onDeleted) onDeleted();
    else router.replace(kind === "NOTEBOOK" ? "/notebooks" : "/books");
    router.refresh();
  }

  return (
    <ConfirmDialog
      trigger={<Button type="button" variant="ghost" size="sm" disabled={disabled} className="text-danger hover:text-danger" aria-label={`Delete ${label}: ${title}`}><Trash2 aria-hidden="true" className="h-4 w-4" />Delete {label}</Button>}
      title={`Delete “${title}”?`}
      description={`This ${label}, its reading order, shared access, comments, and reading progress will be permanently removed. Your original notes, reviewers, and quizzes will remain in your library.`}
      confirmLabel={`Delete ${label}`}
      destructive
      onConfirm={handleDelete}
    />
  );
}
