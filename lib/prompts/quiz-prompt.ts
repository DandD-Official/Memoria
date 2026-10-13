import { buildMmdOutputRules } from "@/lib/mmd/ai-instructions";

export interface QuizPromptOptions {
  questionCount: number;
  difficulty: "EASY" | "NORMAL" | "HARD" | "MIXED";
  mode?: "QUIZ" | "PRACTICE_EXAM" | "MOCK_EXAM" | "TIMED_EXAM" | "MASTERY_TEST";
  questionTypes: string[]; // e.g. ["multiple_choice", "true_false"]
  distribution: string; // balanced | concept_heavy | definition_heavy | application_heavy | custom
  includeExplanations: boolean;
  randomize: boolean;
}

interface SourceForPrompt {
  title: string;
  content: string;
}

const TYPE_SCHEMAS: Record<string, string> = {
  multiple_choice: `{ "id": "q1", "type": "multiple_choice", "question": "string", "choices": ["string","string","string","string"], "answer": 0, "explanation": "string", "sourceSection": "string" }`,
  true_false: `{ "id": "q2", "type": "true_false", "question": "string", "answer": true, "explanation": "string", "sourceSection": "string" }`,
  multiple_select: `{ "id": "q3", "type": "multiple_select", "question": "string", "choices": ["string","string","string","string"], "answer": [0,2], "explanation": "string", "sourceSection": "string" }`,
  identification: `{ "id": "q4", "type": "identification", "question": "string", "acceptableAnswers": ["string"], "explanation": "string", "sourceSection": "string" }`,
  fill_in_the_blank: `{ "id": "q5", "type": "fill_in_the_blank", "question": "string with a ____ blank", "acceptableAnswers": ["string"], "explanation": "string", "sourceSection": "string" }`,
  matching: `{ "id": "q6", "type": "matching", "question": "string", "pairs": [{ "left": "string", "right": "string" }], "explanation": "string", "sourceSection": "string" }`,
  short_answer: `{ "id": "q7", "type": "short_answer", "question": "string", "acceptableAnswers": ["string"], "explanation": "string", "sourceSection": "string" }`,
};

/**
 * Builds the "Generate Quiz" prompt sent by the user to an external AI. The
 * AI must generate questions ONLY from the supplied source material and
 * return Memoria's versioned quiz JSON schema.
 */
export function buildQuizGenerationPrompt(sources: SourceForPrompt[], options: QuizPromptOptions): string {
  const sourceBlock = sources
    .map((s, i) => `--- SOURCE ${i + 1}: ${s.title} ---\n${s.content.trim()}\n--- END SOURCE ${i + 1} ---`)
    .join("\n\n");

  const typeList = options.questionTypes.length > 0 ? options.questionTypes : ["multiple_choice"];
  const typeSchemas = typeList.map((t) => TYPE_SCHEMAS[t] ?? "")
    .map(schema => options.includeExplanations ? schema : schema.replace(', "explanation": "string"', ""))
    .filter(Boolean).join(",\n    ");

  return `You are generating quiz questions strictly from the study material provided below.

CRITICAL RULE
Generate questions ONLY from the information present in the source material. Do not introduce outside facts. If the material does not contain enough content for the requested question count, generate fewer questions rather than inventing information.

SETTINGS
- Question count: ${options.questionCount}
- Difficulty: ${options.difficulty}
- Allowed question types: ${typeList.join(", ")}
- Distribution: ${options.distribution}
- Explanations required: ${options.includeExplanations ? "yes, for every question" : "no"}
- Each question needs a unique "id" (e.g. "q1", "q2", ...) — no duplicates.
${options.randomize ? "- Vary topic coverage across the source material rather than clustering on one section." : ""}

ANSWER FORMAT RULES
- multiple_choice: "answer" is the zero-based index of the correct choice.
- multiple_select: "answer" is an array of zero-based indices of ALL correct choices.
- true_false: "answer" is a boolean.
- identification / fill_in_the_blank / short_answer: "acceptableAnswers" lists all acceptable correct answers (include reasonable variants).
- matching: "pairs" lists every correct left/right pair.
- Every question should include "sourceSection" naming the heading/topic it was drawn from.${options.includeExplanations ? ' Include "explanation" describing why the answer is correct.' : ' Omit "explanation"; explanations were not requested.'}

RICH QUIZ CONTENT
- Use MMD in "question", each "choices" string, and "explanation" when it improves the task: code to interpret, math to solve, a table to compare, or a self-contained SVG to analyze. Use examples, definitions, tips, and key-concept blocks in explanations when helpful. Keep straightforward questions concise.
- Keep "title", "sourceSection", "acceptableAnswers", and both matching "pairs.left" and "pairs.right" as plain text. Typed answers are compared as text; never put formatting or MMD fences in these answer values. Put rich matching context in "question" instead.
- Keep answers, correctness hints, revealing visual labels, and worked solutions out of questions and choices. Put teaching feedback only in "explanation" when requested, so exam mode does not reveal answers early. Do not mark the correct choice with a success block or icon.
- Preserve meaningful MMD structure, icons, and nested layers from source material when reused, but remove any source content that gives away the answer. Do not prepend option letters or question numbers to rich fields; the quiz supplies those separately.

${buildMmdOutputRules("quiz-fields")}

JSON STRING ENCODING
- MMD remains a string, never an object or extra JSON property. Use standard JSON escaping: a newline encodes as ${JSON.stringify("\n")}, a double quote as ${JSON.stringify('"')}, and a backslash as ${JSON.stringify("\\")}. Do not place raw line breaks inside a JSON string.
- After JSON decoding, every MMD opening and closing fence must be on its own line. Close all nested blocks, from the innermost outward. Use :::code instead of triple-backtick code fences inside fields.
- This is a JSON-encoded example of a rich question string (syntax illustration only; use the supplied source and requested question types):
${JSON.stringify('Read this code. What value does it print?\n\n:::code{language="python" title="Trace the value"}\nx = 2\nprint(x + 3)\n:::')}

OUTPUT FORMAT
Return the JSON object below inside exactly one copy-ready Markdown code fence (\`\`\`json ... \`\`\`). Do not add prose outside the fence.

{
  "format": "memoria-quiz",
  "version": "1.0",
  "title": "string",
  "settings": { "mode": "${options.mode ? options.mode.toLowerCase() : "quiz"}", "difficulty": "${options.difficulty.toLowerCase()}", "questionCount": ${options.questionCount} },
  "questions": [
    ${typeSchemas}
  ]
}

SOURCE MATERIAL
${sourceBlock}

Return only the JSON object described above inside the single \`\`\`json snippet.`;
}
