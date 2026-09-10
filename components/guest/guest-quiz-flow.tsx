"use client";

import { useState } from "react";
import { Check, Copy, FileJson, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { FileDropzone } from "@/components/notes/file-dropzone";
import { QuestionInput } from "@/components/quizzes/question-input";
import { parseAiJson, validateStructuredQuiz, type StructuredQuiz } from "@/lib/validation/quiz";
import { formatCorrectAnswer, gradeQuiz, isAnswerCorrect } from "@/lib/quiz-grading";
import { cn } from "@/lib/utils";
import { ExportMenu } from "@/components/exports/export-menu";

const QUESTION_TYPES = [
  ["multiple_choice", "Multiple choice"],
  ["multiple_select", "Multiple select"],
  ["true_false", "True / False"],
  ["identification", "Identification"],
  ["fill_in_the_blank", "Fill in the blank"],
  ["matching", "Matching"],
  ["short_answer", "Short answer"],
] as const;
const PLACEHOLDER_NOTE = "[Paste your notes here before sending this prompt to the AI]";
type TestMode = "review" | "exam";

export function GuestQuizFlow({ activityMode = "quiz" }: { activityMode?: "quiz" | "exam" }) {
  const activityLabel = activityMode === "exam" ? "exam" : "quiz";
  const [source, setSource] = useState<"generate" | "import">("generate");
  const [notesText, setNotesText] = useState("");
  const [title, setTitle] = useState(activityMode === "exam" ? "My exam" : "My quiz");
  const [questionCount, setQuestionCount] = useState(10);
  const [difficulty, setDifficulty] = useState<"EASY" | "NORMAL" | "HARD" | "MIXED">("MIXED");
  const [questionTypes, setQuestionTypes] = useState<string[]>(["multiple_choice", "true_false"]);
  const [prompt, setPrompt] = useState("");
  const [copied, setCopied] = useState(false);
  const [pastedJson, setPastedJson] = useState("");
  const [validation, setValidation] = useState<
    { valid: true; data: StructuredQuiz } | { valid: false; errors: string[] } | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [testMode, setTestMode] = useState<TestMode | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<{
    score: number;
    total: number;
    graded: Record<string, { given: unknown; correct: boolean }>;
  } | null>(null);
  const quiz = validation?.valid ? validation.data : null;

  function toggleType(type: string) {
    setQuestionTypes((previous) => previous.includes(type) ? previous.filter((item) => item !== type) : [...previous, type]);
  }

  async function handleFileUpload(file: File) {
    setUploading(true);
    setError(null);
    setNotice(null);
    const form = new FormData();
    form.append("file", file);
    try {
      const response = await fetch("/api/guest/extract", { method: "POST", body: form });
      const data = await response.json().catch(() => null);
      if (!data || !response.ok) {
        setError(data?.error ?? "Couldn't read that file.");
        return;
      }
      setNotesText(data.text);
      setTitle(data.title || title);
      if (data.notice) setNotice(data.notice);
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setUploading(false);
    }
  }

  async function handleJsonFile(file: File) {
    setError(null);
    if (file.size > 2_000_000) {
      setError("That JSON file is too large (2 MB maximum).");
      return;
    }
    try {
      const raw = await file.text();
      setPastedJson(raw);
      validateJson(raw);
    } catch {
      setError("Couldn't read that JSON file.");
    }
  }

  async function generatePrompt() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/guest/prompts/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content: notesText.trim() || PLACEHOLDER_NOTE,
          options: {
            questionCount,
            difficulty,
            questionTypes,
            mode: activityMode === "exam" ? "MOCK_EXAM" : "QUIZ",
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Couldn't generate prompt.");
        return;
      }
      setPrompt(data.text);
    } catch {
      setError("We couldn't reach the server.");
    } finally {
      setLoading(false);
    }
  }

  function copyPrompt() {
    void navigator.clipboard.writeText(prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  function validateJson(raw = pastedJson) {
    setError(null);
    setResult(null);
    setTestMode(null);
    try {
      const parsed = validateStructuredQuiz(parseAiJson(raw));
      if (parsed.success) {
        setTitle(parsed.data.title);
        setValidation({ valid: true, data: parsed.data });
      } else {
        setValidation({ valid: false, errors: parsed.errors.map((item) => `${item.path}: ${item.message}`) });
      }
    } catch (validationError) {
      setValidation({ valid: false, errors: [validationError instanceof Error ? validationError.message : "Invalid JSON."] });
    }
  }

  function startTest(mode: TestMode) {
    setAnswers({});
    setChecked(new Set());
    setResult(null);
    setTestMode(mode);
  }

  function updateAnswer(questionId: string, value: unknown) {
    setAnswers((previous) => ({ ...previous, [questionId]: value }));
    setChecked((previous) => {
      const next = new Set(previous);
      next.delete(questionId);
      return next;
    });
  }

  function submitTest() {
    if (!quiz) return;
    const graded = gradeQuiz(quiz.questions, answers);
    setResult({ score: graded.score, total: graded.total, graded: graded.gradedAnswers });
    setTestMode(null);
  }

  function downloadJson() {
    if (!quiz) return;
    const blob = new Blob([JSON.stringify(quiz, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${quiz.title.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function exportPdf() {
    if (!quiz) return;
    const { exportQuizToPdf } = await import("@/lib/pdf-export");
    exportQuizToPdf(quiz.title, quiz.questions, { mode: quiz.settings.mode, author: "Guest" });
  }

  async function exportQuiz(format: string) {
    if (!quiz) return;
    if (format === "pdf") return exportPdf();
    if (format === "docx") { const { exportQuizToWord } = await import("@/lib/word-export"); await exportQuizToWord(quiz.title, quiz.questions, { mode: quiz.settings.mode, author: "Guest" }); return; }
    downloadJson();
  }

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <p className="text-sm font-medium text-ink">How would you like to create this {activityLabel}?</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <SourceButton active={source === "generate"} onClick={() => setSource("generate")} icon={<FileText className="mb-2 h-5 w-5" />} title="Generate with AI" description="Build a tailored prompt from notes or a topic." />
          <SourceButton active={source === "import"} onClick={() => setSource("import")} icon={<FileJson className="mb-2 h-5 w-5" />} title="Import JSON" description="Open a Memoria quiz file directly in this browser." />
        </div>
      </div>

      {source === "generate" ? (
        <div className="card p-5">
          <p className="mb-3 text-sm font-medium text-ink">1. Add notes or describe your topic</p>
          <FileDropzone onFileSelected={handleFileUpload} accept=".md,.txt,.pdf,.docx,.pptx,.json" />
          {uploading && <p className="mt-2 text-xs text-ink-soft">Reading file…</p>}
          {notice && <p className="mt-2 rounded-lg border border-accent/30 bg-accent-soft/40 p-2.5 text-xs text-accent-dark">{notice}</p>}
          <Textarea rows={6} value={notesText} onChange={(event) => setNotesText(event.target.value)} placeholder="Paste notes or describe the subject…" className="mt-3 font-mono text-sm" />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div><Label htmlFor="guest-qcount">Question count</Label><Input id="guest-qcount" type="number" min={1} max={50} value={questionCount} onChange={(event) => setQuestionCount(Number(event.target.value))} /></div>
            <div><Label htmlFor="guest-difficulty">Difficulty</Label><select id="guest-difficulty" value={difficulty} onChange={(event) => setDifficulty(event.target.value as typeof difficulty)} className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm">{["EASY", "NORMAL", "HARD", "MIXED"].map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
          </div>
          <div className="mt-3">
            <Label>Question types</Label>
            <div className="flex flex-wrap gap-2">{QUESTION_TYPES.map(([value, label]) => <button type="button" key={value} onClick={() => toggleType(value)} className={cn("rounded-full border px-3 py-1.5 text-xs font-medium", questionTypes.includes(value) ? "border-accent bg-accent-soft text-accent-dark" : "border-line text-ink-soft hover:bg-ink/5")}>{label}</button>)}</div>
          </div>
          <Button className="mt-4" onClick={generatePrompt} loading={loading} disabled={questionTypes.length === 0}>Generate prompt</Button>
        </div>
      ) : (
        <div className="card p-5">
          <p className="text-sm font-medium text-ink">Import a Memoria JSON file</p>
          <p className="mt-1 text-xs text-ink-soft">The file stays in your browser and is not uploaded.</p>
          <Input className="mt-3" type="file" accept=".json,application/json" onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleJsonFile(file); }} />
        </div>
      )}

      {(source === "import" || prompt) && (
        <div className="card p-5">
          {source === "generate" && <><p className="mb-2 text-sm font-medium text-ink">2. Copy this prompt into your preferred AI</p><Textarea readOnly rows={10} value={prompt} className="font-mono text-xs" /><Button variant="outline" size="sm" className="mt-2" onClick={copyPrompt}>{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? "Copied" : "Copy prompt"}</Button></>}
          <p className={cn("mb-2 text-sm font-medium text-ink", source === "generate" && "mt-5")}>{source === "generate" ? "3. Paste the AI's JSON response" : "Or paste JSON below"}</p>
          <Textarea rows={8} value={pastedJson} onChange={(event) => { setPastedJson(event.target.value); setValidation(null); }} placeholder='{"format": "memoria-quiz", ...}' className="font-mono text-xs" />
          <Button variant="outline" size="sm" className="mt-2" onClick={() => validateJson()} disabled={!pastedJson.trim()}>Validate</Button>

          {validation && !validation.valid && <div className="mt-3 rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm text-danger"><p className="font-medium">This doesn&apos;t match the expected format:</p><ul className="mt-1 list-disc pl-5">{validation.errors.slice(0, 5).map((item) => <li key={item}>{item}</li>)}</ul></div>}

          {quiz && !testMode && !result && (
            <div className="mt-4 space-y-4">
              <div className="rounded-lg border border-success/30 bg-success/5 p-3 text-sm text-success">{quiz.questions.length} questions parsed and ready.</div>
              <div><p className="mb-2 text-sm font-medium text-ink">Choose a test-taking mode</p><div className="grid gap-3 sm:grid-cols-2"><ModeButton onClick={() => startTest("review")} title="Review mode" description="Check each response and see explanations immediately." /><ModeButton onClick={() => startTest("exam")} title="Exam mode" description="No feedback until the final submission." /></div></div>
              <ExportMenu options={[{ value: "pdf", label: "PDF document" }, { value: "docx", label: "Word document" }, { value: "json", label: "Memoria JSON" }]} onExport={exportQuiz} />
            </div>
          )}

          {testMode && quiz && (
            <div className="mt-5 space-y-4">
              <div className="rounded-lg bg-ink/5 px-3 py-2 text-sm text-ink-soft">{testMode === "review" ? "Review mode — check answers as you go." : "Exam mode — feedback appears after submission."}</div>
              {quiz.questions.map((question, index) => {
                const wasChecked = checked.has(question.id);
                const correct = wasChecked && isAnswerCorrect(question, answers[question.id]);
                return <div key={question.id} className="card p-4"><p className="mb-3 text-sm font-medium text-ink">{index + 1}. {question.question}</p><QuestionInput question={question} value={answers[question.id]} onChange={(value) => updateAnswer(question.id, value)} />{testMode === "review" && <><Button variant="outline" size="sm" className="mt-3" disabled={answers[question.id] === undefined} onClick={() => setChecked((previous) => new Set(previous).add(question.id))}>Check answer</Button>{wasChecked && <div className={cn("mt-3 rounded-lg border p-3 text-sm", correct ? "border-success/30 bg-success/5" : "border-danger/30 bg-danger/5")}><p className="font-semibold">{correct ? "Correct" : "Not quite"}</p><p className="mt-1">Correct answer: {formatCorrectAnswer(question)}</p><p className="mt-1 text-ink-soft">{question.explanation || "No explanation was provided."}</p></div>}</>}</div>;
              })}
              <Button onClick={submitTest}>Submit {activityLabel}</Button>
            </div>
          )}

          {result && quiz && (
            <div className="mt-5 space-y-3">
              <div className="card p-6 text-center"><p className="text-xs uppercase tracking-wide text-ink-faint">Your score</p><p className="mt-1 font-display text-4xl text-ink">{Math.round((result.score / Math.max(result.total, 1)) * 100)}%</p><p className="mt-1 text-sm text-ink-soft">{result.score} out of {result.total} correct</p><Button size="sm" variant="outline" className="mt-3" onClick={() => startTest("exam")}>Retake in exam mode</Button></div>
              {quiz.questions.map((question, index) => { const graded = result.graded[question.id]; return <div key={question.id} className="card p-4"><p className="text-sm font-medium text-ink">{index + 1}. {question.question} {graded?.correct ? "✅" : "❌"}</p><p className="mt-2 text-sm">Correct answer: {formatCorrectAnswer(question)}</p><p className="mt-1 text-sm text-ink-soft">{question.explanation || "No explanation was provided."}</p></div>; })}
            </div>
          )}
        </div>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}

function SourceButton({ active, onClick, icon, title, description }: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; description: string }) {
  return <button type="button" onClick={onClick} className={cn("rounded-xl border p-4 text-left", active ? "border-accent bg-accent-soft/50" : "border-line")} >{icon}<span className="block text-sm font-semibold">{title}</span><span className="text-xs text-ink-soft">{description}</span></button>;
}

function ModeButton({ onClick, title, description }: { onClick: () => void; title: string; description: string }) {
  return <button type="button" onClick={onClick} className="rounded-xl border border-line p-4 text-left hover:border-accent"><span className="block text-sm font-semibold">{title}</span><span className="text-xs text-ink-soft">{description}</span></button>;
}
