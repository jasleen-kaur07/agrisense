import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 active:translate-y-px text-[15px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-55";
const variants: Record<ButtonVariant, string> = {
  primary: "bg-forest text-surface shadow-sm hover:bg-forest2",
  secondary: "border border-line-dark bg-surface text-forest hover:bg-sage2",
  ghost: "text-olive-ink hover:bg-sage2",
  danger: "border border-terracotta-ink bg-surface text-terracotta-ink hover:bg-terracotta-soft",
};

export function buttonClass(variant: ButtonVariant = "primary", className?: string) {
  return cn(base, variants[variant], className);
}
