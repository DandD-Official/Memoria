import { cn } from "@/lib/utils";

const shimmer = "animate-shimmer rounded-full bg-[linear-gradient(90deg,rgb(var(--color-ink)/0.04),rgb(var(--color-ink)/0.1),rgb(var(--color-ink)/0.04))] bg-[length:200%_100%]";

export function LoadingState({ label = "Loading…", rows = 3, className }: { label?: string; rows?: number; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-3 py-8", className)} role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="card overflow-hidden p-4" aria-hidden="true">
          <div className={cn("h-3 w-24", shimmer)} />
          <div className={cn("mt-3 h-4 w-2/3", shimmer)} />
        </div>
      ))}
    </div>
  );
}
