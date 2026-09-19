import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { FlashcardDeck } from "@/components/study/flashcard-deck";
import { EmptyState } from "@/components/ui/empty-state";
import { CheckCircle2 } from "lucide-react";

export default async function DueReviewPage() {
  const user = await requireUser();
  const due = await prisma.flashcard.findMany({
    where: { ownerId: user.id, OR: [{ progress: { none: { userId: user.id } } }, { progress: { some: { userId: user.id, dueAt: { lte: new Date() } } } }] },
    orderBy: { updatedAt: "asc" }, take: 100, select: { id: true, front: true, back: true },
  });
  if (!due.length) return <div className="mx-auto max-w-2xl"><h1 className="mb-8 font-display text-3xl">A moment to let it settle.</h1><EmptyState icon={CheckCircle2} title="You’re caught up." description="No cards are due right now. Return when another review is ready, or explore a different study guide." actionLabel="Explore your study guides" actionHref="/reviewers" secondaryActionLabel="Return to practice" secondaryActionHref="/study" /></div>;
  return <FlashcardDeck title="Due flashcards" cards={due} tracked />;
}
