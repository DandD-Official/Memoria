import { ListChecks } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { EmptyState } from "@/components/ui/empty-state";
import { QuizWizardLauncher } from "@/components/quizzes/quiz-wizard-launcher";
import { formatRelativeTime } from "@/lib/utils";
import { LibraryNavigation } from "@/components/library/library-navigation";
import { TagList } from "@/components/library/tag-list";
import { PageActions, PageDescription, PageHeader, PageHeaderContent, PageShell, PageTitle } from "@/components/ui/page";
import { ResourceCard } from "@/components/library/resource-card";

export default async function QuizzesPage(props: { searchParams: Promise<{ create?: string; fromNote?: string; fromReviewer?: string; source?: string; page?: string }> }) {
  const searchParams = await props.searchParams;
  const user = await requireUser();
  const page = Math.max(1, Number(searchParams.page) || 1);
  const [quizzes, notes, reviewers, settings] = await Promise.all([
    prisma.quiz.findMany({ where: { ownerId: user.id, archivedAt: null }, orderBy: { updatedAt: "desc" }, skip: (page - 1) * 24, take: 24, select: { id: true, title: true, mode: true, questions: true, updatedAt: true, isFavorite: true, tags: { select: { tag: { select: { id: true, name: true, color: true } } } } } }),
    prisma.note.findMany({ where: { ownerId: user.id, archivedAt: null }, orderBy: { updatedAt: "desc" }, select: { id: true, title: true } }),
    prisma.reviewer.findMany({ where: { ownerId: user.id, archivedAt: null }, orderBy: { updatedAt: "desc" }, select: { id: true, title: true } }),
    prisma.userSettings.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {}, select: { defaultQuestionCount: true, defaultDifficulty: true, defaultQuizMode: true } }),
  ]);

  return (
    <PageShell className="max-w-5xl">
      <PageHeader>
        <PageHeaderContent>
          <PageTitle>Quizzes</PageTitle>
          <PageDescription>Test recall with questions built from your own material.</PageDescription>
        </PageHeaderContent>
        <PageActions>
          <QuizWizardLauncher key={`${searchParams.create}-${searchParams.source}-${searchParams.fromNote}-${searchParams.fromReviewer}`} notes={notes} reviewers={reviewers} defaultNoteId={searchParams.fromNote} defaultReviewerId={searchParams.fromReviewer} initiallyOpen={searchParams.create === "1"} initialMode={searchParams.source === "import" ? "import" : "existing"} defaults={{ questionCount: settings.defaultQuestionCount, difficulty: settings.defaultDifficulty, mode: settings.defaultQuizMode }} />
        </PageActions>
      </PageHeader>

      <LibraryNavigation basePath="/quizzes" page={page} hasNext={quizzes.length === 24} />

      {quizzes.length === 0 ? (
        <EmptyState icon={ListChecks} title="Create your first quiz" description="Build questions from a Memory or reviewer, or import an existing quiz." actionLabel={notes.length > 0 || reviewers.length > 0 ? "Choose study material" : "Import a Memory first"} actionHref={notes.length > 0 || reviewers.length > 0 ? "/quizzes?create=1&source=existing" : "/notes/import"} secondaryActionLabel="Import quiz" secondaryActionHref="/quizzes?create=1&source=import" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quizzes.map((quiz) => {
            const questionCount = Array.isArray(quiz.questions) ? (quiz.questions as unknown[]).length : 0;
            return (
              <ResourceCard key={quiz.id} href={`/quizzes/${quiz.id}`} kind="quiz" title={quiz.title} badge={quiz.mode.replace("_", " ")} meta={formatRelativeTime(quiz.updatedAt)} favorite={quiz.isFavorite} description={`${questionCount} question${questionCount !== 1 ? "s" : ""}`}>
                <TagList tags={quiz.tags.map(({ tag }) => tag)} />
              </ResourceCard>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
