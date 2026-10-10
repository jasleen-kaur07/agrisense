import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

export type StepState = "done" | "current" | "todo";

/** Ordered progress list. `labels` are already translated. */
export function Steps({ labels, current, label }: { labels: string[]; current: number; label: string }) {
  return (
    <ol aria-label={label} className="flex flex-wrap gap-x-6 gap-y-2">
      {labels.map((l, i) => {
        const state: StepState = i < current ? "done" : i === current ? "current" : "todo";
        return (
          <li key={l} aria-current={state === "current" ? "step" : undefined} className="flex items-center gap-2 text-sm">
            <span
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold",
                state === "done" && "border-olive-ink bg-olive-ink text-surface",
                state === "current" && "border-forest bg-forest text-surface",
                state === "todo" && "border-line-dark text-muted",
              )}
            >
              {state === "done" ? <Check aria-hidden className="h-4 w-4" /> : i + 1}
            </span>
            <span className={cn(state === "todo" ? "text-muted" : "font-semibold text-ink")}>{l}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function TaskList({ items }: { items: { label: string; status: "pending" | "done" | "error" }[] }) {
  return (
    <ul className="space-y-3">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-3 text-[15px]">
          {i.status === "pending" && <Loader2 aria-hidden className="spin h-5 w-5 text-olive-ink" />}
          {i.status === "done" && <Check aria-hidden className="h-5 w-5 text-olive-ink" />}
          {i.status === "error" && <span aria-hidden className="h-5 w-5 text-terracotta-ink">!</span>}
          <span>{i.label}</span>
        </li>
      ))}
    </ul>
  );
}
