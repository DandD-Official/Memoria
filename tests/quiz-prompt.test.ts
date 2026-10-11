import { describe, expect, it } from "vitest";
import { buildQuizGenerationPrompt, type QuizPromptOptions } from "@/lib/prompts/quiz-prompt";
import { parseMmd, collectMmdErrors } from "@/lib/mmd/parser";
import { validateStructuredQuiz } from "@/lib/validation/quiz";

const options: QuizPromptOptions = { questionCount: 3, difficulty: "NORMAL", questionTypes: ["multiple_choice"], distribution: "balanced", includeExplanations: true, randomize: false };
const sources = [{ title: "Python", content: "Adding 3 to 2 gives 5." }];

describe("quiz generation with MMD", () => {
  it("uses shared MMD rules without replacing the quiz JSON response contract", () => {
    const prompt = buildQuizGenerationPrompt(sources, options);
    for (const block of ["code", "math", "svg", "card", "tip", "columns", "key-concept"]) expect(prompt).toContain(`:::${block}`);
    expect(prompt).toContain("```json");
    expect(prompt).not.toContain("```markdown");
    expect(prompt).toContain("Keep answers, correctness hints");
    expect(prompt).toContain('"acceptableAnswers", and both matching "pairs.left" and "pairs.right" as plain text');
    expect(prompt).toContain(sources[0].content);
  });

  it("provides a JSON string example that decodes to valid MMD and fits the quiz schema", () => {
    const prompt = buildQuizGenerationPrompt(sources, options);
    const example = prompt.split("\n").find(line => line.startsWith('"Read this code.'));
    expect(example).toBeDefined();
    const question = JSON.parse(example!);
    expect(collectMmdErrors(parseMmd(question))).toEqual([]);
    expect(question).toContain(':::code{language="python"');
    expect(validateStructuredQuiz({ format: "memoria-quiz", version: "1.0", title: "Python", settings: { mode: "quiz", difficulty: "normal", questionCount: 1 }, questions: [{ id: "q1", type: "multiple_choice", question, choices: ["2", "5"], answer: 1 }] }).success).toBe(true);
    expect(prompt).toContain(`a double quote as ${JSON.stringify('"')}`);
  });

  it("honors disabled explanations in both instructions and schema examples", () => {
    const prompt = buildQuizGenerationPrompt(sources, { ...options, mode: "MOCK_EXAM", includeExplanations: false });
    expect(prompt).toContain('Omit "explanation"');
    expect(prompt).not.toContain('"explanation": "string"');
    expect(prompt).toContain('"mode": "mock_exam"');
  });
});
