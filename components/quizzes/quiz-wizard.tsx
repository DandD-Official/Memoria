"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, Plus, X, UploadCloud, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { validateStructuredQuiz, quizConfigurationSchema, parseAiJson } from "@/lib/validation/quiz";
import { cn } from "@/lib/utils";
import { AiSourcePicker, type AiKeySource } from "@/components/ai/ai-source-picker";

const QUESTION_TYPES = [
  { value: "multiple_choice", label: "Multiple choice" },
  { value: "true_false", label: "True / False" },
  { value: "multiple_select", label: "Multiple select" },
  { value: "identification", label: "Identification" },
  { value: "fill_in_the_blank", label: "Fill in the blank" },
  { value: "matching", label: "Matching" },
  { value: "short_answer", label: "Short answer" },
];

const MODES = [
  { value: "QUIZ", label: "Quiz" },
  { value: "PRACTICE_EXAM", label: "Practice Exam" },
  { value: "MOCK_EXAM", label: "Mock Exam" },
  { value: "TIMED_EXAM", label: "Timed Exam" },
  { value: "MASTERY_TEST", label: "Mastery Test" },
] as const;

interface Source {
  id: string;
  title: string;
}

export function QuizWizard({ notes, reviewers, defaultNoteId, defaultReviewerId, defaults, initiallyOpen = false, initialMode = "existing", systemAvailable = false }: { notes: Source[]; reviewers: Source[]; defaultNoteId?: string; defaultReviewerId?: string; defaults: { questionCount: number; difficulty: "EASY" | "NORMAL" | "HARD" | "MIXED"; mode: (typeof MODES)[number]["value"] }; initiallyOpen?: boolean; initialMode?: "existing" | "import"; systemAvailable?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(Boolean(defaultNoteId || defaultReviewerId) || initiallyOpen);
  const [step, setStep] = useState(initialMode === "import" ? 4 : 1);
  const [directImport, setDirectImport] = useState(initialMode === "import");
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>(defaultNoteId ? [defaultNoteId] : []);
  const [selectedReviewerIds, setSelectedReviewerIds] = useState<string[]>(defaultReviewerId ? [defaultReviewerId] : []);
  const [mode, setMode] = useState<(typeof MODES)[number]["value"]>(defaults.mode);
  const [questionCount, setQuestionCount] = useState(defaults.questionCount);
  const [difficulty, setDifficulty] = useState<"EASY" | "NORMAL" | "HARD" | "MIXED">(defaults.difficulty);
  const [questionTypes, setQuestionTypes] = useState<string[]>(["multiple_choice", "true_false"]);
  const [prompt, setPrompt] = useState("");
  const [copied, setCopied] = useState(false);
  const [pastedJson, setPastedJson] = useState("");
  const [validation, setValidation] = useState<{ valid: boolean; errors?: string[]; data?: unknown } | null>(null);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<AiKeySource>(systemAvailable ? "system" : "personal");

  const totalSelected = selectedNoteIds.length + selectedReviewerIds.length;

  function toggleType(t: string) {
    setQuestionTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  async function generatePrompt() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/prompts/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noteIds: selectedNoteIds,
          reviewerIds: selectedReviewerIds,
          options: { questionCount, difficulty, mode, questionTypes, distribution: "balanced", includeExplanations: true, randomize: true },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't generate prompt.");
        setLoading(false);
        return;
      }
      setPrompt(data.text);
      setStep(3);
    } catch {
      setError("We couldn't reach the server.");
    }
    setLoading(false);
  }

  function copyPrompt() {
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function generateWithConnectedAi() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/ai/general", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, source }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        if (payload?.code === "AI_SYSTEM_NOT_CONFIGURED") {
          setError("Memoria AI is not configured yet. Choose your own connected key or ask an administrator to add a system key.");
          return;
        }
        if (payload?.code === "NO_AI_CONNECTION") {
          setError("No personal AI key is connected. Add one in Settings → AI providers or choose Memoria AI.");
          return;
        }
        setError(payload?.code === "AI_PROVIDER_BUSY"
          ? "All selected AI keys are temporarily busy. Memoria tried each key; try again in a moment."
          : payload?.error ?? "AI generation failed.");
        return;
      }
      const parsed = parseAiJson(payload.text);
      const result = validateStructuredQuiz(parsed);
      setPastedJson(payload.text);
      if (result.success) {
        setValidation({ valid: true, data: result.data });
        setTitle(result.data.title);
      } else {
        setValidation({ valid: false, errors: result.errors.map((item) => `${item.path}: ${item.message}`) });
      }
      setStep(4);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "AI generation failed.");
    } finally {
      setLoading(false);
    }
  }

  function validateQuizJson(raw: string) {
    setError(null);
    try {
      const parsed = parseAiJson(raw);
      const result = validateStructuredQuiz(parsed);
      if (result.success) {
        setValidation({ valid: true, data: result.data });
        setTitle(result.data.title);
      } else {
        setValidation({ valid: false, errors: result.errors.map((e) => `${e.path}: ${e.message}`) });
      }
    } catch (err) {
      setValidation({ valid: false, errors: [err instanceof Error ? err.message : "That's not valid JSON."] });
    }
  }

  function handleValidate() {
    validateQuizJson(pastedJson);
  }

  async function importQuizFile(file: File) {
    setError(null);
    try {
      const raw = await file.text();
      setPastedJson(raw);
      validateQuizJson(raw);
    } catch {
      setError("This quiz file couldn't be read.");
    }
  }

  async function handleSave() {
    if (!validation?.valid) return;
    setLoading(true);
    setError(null);

    const data = validation.data as { questions: unknown[] };
    const configuration = quizConfigurationSchema.parse({ questionCount, difficulty });

    const res = await fetch("/api/quizzes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title || "Untitled quiz",
        noteIds: selectedNoteIds,
        reviewerIds: selectedReviewerIds,
        mode,
        configuration,
        questions: data.questions,
      }),
    });
    const result = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(result.error ?? "Couldn't save quiz.");
      return;
    }
    router.push(`/quizzes/${result.quiz.id}`);
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Create quiz
      </Button>
    );
  }

  return (
    <div className="card p-6">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-display text-lg text-ink">New quiz</h2>
        <button onClick={() => setOpen(false)} className="text-ink-faint hover:text-ink">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-6 flex flex-wrap gap-2 text-xs font-medium text-ink-faint">
        {["Select source", "Configure", "Generate & copy", "Import result"].map((label, i) => (
          <span key={label} className={cn("rounded-full px-2.5 py-1", step === i + 1 ? "bg-action text-action-foreground" : "bg-ink/5")}>
            {i + 1}. {label}
          </span>
        ))}
      </div>

      {step === 1 && (
        <div>
          <p className="mb-4 text-sm text-ink-soft">Choose existing notes or reviewers from your library. You do not need to upload the same material again.</p>
          {reviewers.length > 0 && (
            <>
              <Label>Reviewers</Label>
              <div className="mb-4 space-y-1.5">
                {reviewers.map((r) => (
                  <label key={r.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-line p-2.5 hover:bg-ink/5">
                    <input
                      type="checkbox"
                      checked={selectedReviewerIds.includes(r.id)}
                      onChange={() => setSelectedReviewerIds((p) => (p.includes(r.id) ? p.filter((x) => x !== r.id) : [...p, r.id]))}
                    />
                    <span className="text-sm text-ink">{r.title}</span>
                  </label>
                ))}
              </div>
            </>
          )}
          <Label>Existing Notes</Label>
          {notes.length === 0 ? (
            <p className="text-sm text-ink-soft">No notes yet.</p>
          ) : (
            <div className="max-h-48 space-y-1.5 overflow-y-auto">
              {notes.map((n) => (
                <label key={n.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-line p-2.5 hover:bg-ink/5">
                  <input
                    type="checkbox"
                    checked={selectedNoteIds.includes(n.id)}
                    onChange={() => setSelectedNoteIds((p) => (p.includes(n.id) ? p.filter((x) => x !== n.id) : [...p, n.id]))}
                  />
                  <span className="text-sm text-ink">{n.title}</span>
                </label>
              ))}
            </div>
          )}
          <div className="mt-5 flex justify-end">
            <Button disabled={totalSelected === 0} onClick={() => { setDirectImport(false); setStep(2); }}>Next</Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <Label>Mode</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {MODES.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setMode(m.value)}
                  className={cn("rounded-lg border px-3 py-2 text-sm", mode === m.value ? "border-action bg-action text-action-foreground" : "border-line text-ink-soft hover:bg-ink/5")}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="qcount">Question count</Label>
              <Input id="qcount" type="number" min={1} max={100} value={questionCount} onChange={(e) => setQuestionCount(Number(e.target.value))} />
            </div>
            <div>
              <Label htmlFor="difficulty">Difficulty</Label>
              <select
                id="difficulty"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as typeof difficulty)}
                className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm"
              >
                {["EASY", "NORMAL", "HARD", "MIXED"].map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div>
            <Label>Question types</Label>
            <div className="flex flex-wrap gap-2">
              {QUESTION_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => toggleType(t.value)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium",
                    questionTypes.includes(t.value) ? "border-accent bg-accent-soft text-accent-dark" : "border-line text-ink-soft hover:bg-ink/5"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
            <Button onClick={generatePrompt} loading={loading} disabled={questionTypes.length === 0}>Generate prompt</Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <p className="mb-2 text-sm text-ink-soft">Copy this prompt and paste it into Claude or another AI assistant.</p>
          <Textarea readOnly rows={10} value={prompt} className="font-mono text-xs" />
          <div className="mt-4 space-y-4">
            <AiSourcePicker value={source} onChange={setSource} systemAvailable={systemAvailable} />
            <div className="flex flex-wrap items-center justify-between gap-2">
            <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void generateWithConnectedAi()} loading={loading}>
                <Sparkles className="h-4 w-4" /> Generate here
              </Button>
              <Button variant="outline" onClick={copyPrompt}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copied" : "Copy prompt"}
              </Button>
              <Button onClick={() => setStep(4)}>I have the result</Button>
            </div>
            </div>
          </div>
        </div>
      )}

      {step === 4 && (
        <div>
          <label className="mb-4 flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-line bg-surface p-5 text-sm font-medium text-ink-soft transition-colors hover:border-accent hover:bg-accent-soft">
            <UploadCloud className="h-4 w-4" /> Import a Memoria quiz JSON file
            <input type="file" accept=".json,application/json" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importQuizFile(file); }} />
          </label>
          <Label htmlFor="quizjson">Paste the AI&apos;s JSON response</Label>
          <Textarea
            id="quizjson"
            rows={10}
            value={pastedJson}
            onChange={(e) => {
              setPastedJson(e.target.value);
              setValidation(null);
            }}
            className="font-mono text-xs"
            placeholder='{"format": "memoria-quiz", ...}'
          />
          <div className="mt-2 flex justify-end">
            <Button variant="outline" size="sm" onClick={handleValidate} disabled={!pastedJson.trim()}>
              <UploadCloud className="h-3.5 w-3.5" /> Validate
            </Button>
          </div>

          {validation && !validation.valid && (
            <div className="mt-3 rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
              <p className="font-medium">This doesn&apos;t match the expected format:</p>
              <ul className="mt-1 list-disc pl-5">
                {validation.errors?.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}

          {validation?.valid && (
            <div className="mt-3 space-y-3">
              <div className="rounded-lg border border-success/30 bg-success/5 p-3 text-sm text-success">
                Looks good — {(validation.data as { questions: unknown[] }).questions.length} questions parsed.
              </div>
              <div>
                <Label htmlFor="quiz-title">Quiz title</Label>
                <Input id="quiz-title" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
            </div>
          )}

          {error && <p className="mt-3 text-sm text-danger">{error}</p>}

          <div className="mt-5 flex justify-between">
            <Button variant="ghost" onClick={() => { if (directImport) setDirectImport(false); setStep(directImport ? 1 : 3); }}>Back</Button>
            <Button onClick={handleSave} disabled={!validation?.valid} loading={loading}>Save quiz</Button>
          </div>
        </div>
      )}
    </div>
  );
}
