import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 text-[15px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-55";
const variants: Record<Variant, string> = {
  primary: "bg-forest text-surface hover:bg-forest2",
  secondary: "border border-line-dark bg-surface text-forest hover:bg-sage2",
  ghost: "text-olive-ink hover:bg-sage2",
  danger: "border border-terracotta-ink bg-surface text-terracotta-ink hover:bg-terracotta-soft",
};

export function buttonClass(variant: Variant = "primary", className?: string) {
  return cn(base, variants[variant], className);
}

export function Button({
  variant = "primary",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type={type} className={buttonClass(variant, className)} {...props} />;
}

export function LinkButton({
  variant = "primary",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={buttonClass(variant, className)} {...props} />;
}
