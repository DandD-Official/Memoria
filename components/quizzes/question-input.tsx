import { cn } from "@/lib/utils";
import { useId } from "react";
import type { QuizQuestion } from "@/lib/validation/quiz";

export function QuestionInput({ question, value, onChange }: { question: QuizQuestion; value: unknown; onChange: (v: unknown) => void }) {
  const groupName = useId();
  switch (question.type) {
    case "multiple_choice":
      return (
        <div className="space-y-2">
          {question.choices.map((choice, i) => (
            <label key={i} className={cn("flex min-h-11 cursor-pointer items-center gap-3 rounded-control border p-3 text-sm", value === i ? "border-ink bg-ink/5" : "border-line hover:bg-ink/5")}>
              <input type="radio" name={groupName} checked={value === i} onChange={() => onChange(i)} />
              {choice}
            </label>
          ))}
        </div>
      );
    case "true_false":
      return (
        <div className="flex gap-2">
          {[true, false].map((v) => (
            <button
              key={String(v)}
              type="button"
              onClick={() => onChange(v)}
              aria-pressed={value === v}
              className={cn("min-h-11 flex-1 rounded-control border py-3 text-sm font-medium", value === v ? "border-action bg-action text-action-foreground" : "border-line text-ink-soft hover:bg-ink/5")}
            >
              {v ? "True" : "False"}
            </button>
          ))}
        </div>
      );
    case "multiple_select": {
      const selected: number[] = Array.isArray(value) ? (value as number[]) : [];
      return (
        <div className="space-y-2">
          {question.choices.map((choice, i) => (
            <label key={i} className={cn("flex min-h-11 cursor-pointer items-center gap-3 rounded-control border p-3 text-sm", selected.includes(i) ? "border-ink bg-ink/5" : "border-line hover:bg-ink/5")}>
              <input
                type="checkbox"
                checked={selected.includes(i)}
                onChange={() => onChange(selected.includes(i) ? selected.filter((x) => x !== i) : [...selected, i])}
              />
              {choice}
            </label>
          ))}
        </div>
      );
    }
    case "identification":
    case "fill_in_the_blank":
    case "short_answer":
      return (
        <input
          type="text"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Your answer"
          placeholder="Type your answer…"
          className="h-11 w-full rounded-control border border-line bg-surface px-3 text-base text-ink focus:border-accent sm:text-sm"
        />
      );
    case "matching": {
      const map: Record<string, string> = (value as Record<string, string>) ?? {};
      return (
        <div className="space-y-2">
          {question.pairs.map((pair, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="w-1/2 text-ink-soft">{pair.left}</span>
              <input
                type="text"
                value={map[pair.left] ?? ""}
                onChange={(e) => onChange({ ...map, [pair.left]: e.target.value })}
                aria-label={`Match for ${pair.left}`}
                placeholder="Match…"
                className="h-10 w-1/2 rounded-control border border-line bg-surface px-3 text-base text-ink focus:border-accent sm:text-sm"
              />
            </div>
          ))}
        </div>
      );
    }
    default:
      return null;
  }
}
