import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const db = vi.hoisted(() => ({ quiz: { findUnique: vi.fn() }, quizAttempt: { findFirst: vi.fn() } }));
vi.mock("@/lib/db", () => ({ prisma: db }));
vi.mock("@/lib/auth/session", () => ({ requireUser: async () => ({ id: "reader-1" }) }));
vi.mock("@/lib/permissions", () => ({ getAccessLevelForOwner: async () => "OWNER" }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); } }));

import QuizResultsPage from "@/app/(app)/quizzes/[id]/results/page";

describe("quiz results", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.quiz.findUnique.mockResolvedValue({
      id: "quiz-1", ownerId: "reader-1", title: "Biology",
      questions: [
        { id: "a", type: "true_false", question: "First question", answer: true },
        { id: "b", type: "true_false", question: "Second question", answer: true },
      ],
    });
    db.quizAttempt.findFirst.mockResolvedValue({
      id: "attempt-1", status: "COMPLETED", testMode: "EXAM", score: 1, totalQuestions: 2,
      questionOrder: ["a", "b"], answers: { a: { given: true, correct: true }, b: { given: false, correct: false } },
    });
  });

  it("does not reveal the answer key for an attempt still in progress", async () => {
    db.quizAttempt.findFirst.mockResolvedValue({ id: "attempt-1", status: "IN_PROGRESS" });
    await expect(QuizResultsPage({ params: Promise.resolve({ id: "quiz-1" }), searchParams: Promise.resolve({ attempt: "attempt-1" }) })).rejects.toThrow("NOT_FOUND");
  });

  it("follows progress links to missed questions and keeps the original numbering", async () => {
    const page = await QuizResultsPage({ params: Promise.resolve({ id: "quiz-1" }), searchParams: Promise.resolve({ attempt: "attempt-1", show: "missed" }) });
    const html = renderToStaticMarkup(page);
    expect(html).not.toContain("First question");
    expect(html).toContain("2. Second question");
    expect(html).toContain("All questions (2)");
  });
});
