import { BookOpenCheck } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

export function NoteReviewerReminder({ noteId }: { noteId?: string }) {
  return <aside aria-label="Turn your notes into a reviewer" className="my-6 flex flex-col gap-4 rounded-card border border-line bg-accent-soft/30 p-5 sm:flex-row sm:items-center">
    <BookOpenCheck className="h-6 w-6 shrink-0 text-accent-dark" aria-hidden="true" />
    <div className="min-w-0 flex-1">
      <h2 className="text-sm font-semibold text-ink">Your note is the starting point</h2>
      <p className="mt-1 text-sm leading-relaxed text-ink-soft">A note holds the material you extracted, pasted, wrote, or generated. Create a reviewer to turn it into an organized study guide with clear sections and explanations that are easier to read.</p>
    </div>
    <ButtonLink variant="outline" className="self-start sm:self-center" href={noteId ? `/reviewers?fromNote=${encodeURIComponent(noteId)}` : "/reviewers?create=1&source=notes"}>Create reviewer</ButtonLink>
  </aside>;
}
