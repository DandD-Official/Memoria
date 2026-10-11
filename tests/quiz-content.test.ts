import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { QuizContent } from "@/components/quizzes/quiz-content";
import { QuestionNavigator, hasAnswer } from "@/components/quizzes/question-navigator";
import { quizChapterMarkdown } from "@/lib/books/document";
import type { QuizQuestion } from "@/lib/validation/quiz";

const question: QuizQuestion = { id: "q", type: "multiple_choice", question: ':::card{title="Recall"}\n:::tip\nUse **evidence**.\n:::\n:::', choices: [':::note\nA rich choice\n:::', "Plain"], answer: 0, explanation: ':::success\nGood reasoning.\n:::' };

describe("rich quiz content", () => {
  it("renders nested MMD in quiz fields and appended chapters", () => {
    for (const content of [question.question, quizChapterMarkdown([question])]) {
      const html = renderToStaticMarkup(createElement(QuizContent, { content }));
      expect(html).toContain("<strong>evidence</strong>");
      expect(html).not.toContain(":::tip");
      expect(html).not.toContain("mmd-error");
    }
    const html = renderToStaticMarkup(createElement(QuizContent, { content: quizChapterMarkdown([question]) }));
    expect(html).toContain("A rich choice");
    expect(html).toContain("Good reasoning.");
    expect(html).not.toContain(":::note");
  });
  it("distinguishes unanswered fields from valid false and zero answers", () => {
    expect(hasAnswer(false)).toBe(true);
    expect(hasAnswer(0)).toBe(true);
    expect(hasAnswer("  ")).toBe(false);
    expect(hasAnswer({ left: " " })).toBe(false);
  });
  it("preserves MMD in matching prompts and answer options when appended", () => {
    const content = quizChapterMarkdown([{ id: "match", type: "matching", question: "Match these", pairs: [{ left: ":::note\nLeft\n:::", right: ":::tip\nRight\n:::" }] }]);
    const html = renderToStaticMarkup(createElement(QuizContent, { content }));
    expect(html).toContain("Left");
    expect(html).toContain("Right");
    expect(html).not.toContain(":::note");
    expect(html).not.toContain(":::tip");
  });
  it("announces current, answered, unanswered and flagged questions", () => {
    const html = renderToStaticMarkup(createElement(QuestionNavigator, { questions: [question, { ...question, id: "b" }], answers: { q: 0 }, index: 1, flagged: new Set(["b"]), onNavigate: () => {} }));
    expect(html).toContain("Question 1, answered");
    expect(html).toContain("Question 2, unanswered, flagged");
    expect(html).toContain('aria-current="step"');
  });
});
