import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-[10px] border border-line bg-surface p-5 sm:p-6", className)} {...props} />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("skeleton h-4 w-full", className)} />;
}

export function Kicker({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("text-[11px] font-bold uppercase tracking-[0.14em] text-olive-ink", className)}>{children}</p>
  );
}

export function PageHeader({
  kicker,
  title,
  lead,
  actions,
}: {
  kicker?: string;
  title: string;
  lead?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {kicker && <Kicker className="mb-2">{kicker}</Kicker>}
        <h1 className="text-3xl leading-tight sm:text-4xl">{title}</h1>
        {lead && <div className="mt-3 text-[15px] leading-relaxed text-ink2">{lead}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </header>
  );
}

type Tone = "neutral" | "olive" | "blue" | "ochre" | "terracotta";
const tones: Record<Tone, string> = {
  neutral: "bg-surface2 text-ink2",
  olive: "bg-sage text-olive-ink",
  blue: "bg-blue-soft text-blue-ink",
  ochre: "bg-ochre-soft text-ochre-ink",
  terracotta: "bg-terracotta-soft text-terracotta-ink",
};
export function Badge({ tone = "neutral", className, ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold tracking-wide", tones[tone], className)}
      {...props}
    />
  );
}
