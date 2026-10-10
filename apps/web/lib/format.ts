import type { Lang } from "@/lib/i18n/core";

const loc = (lang: Lang) => (lang === "hi" ? "hi-IN" : "en-IN");

export function formatDateTime(iso: string | null | undefined, lang: Lang): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(loc(lang), { dateStyle: "medium", timeStyle: "short" }).format(d);
}

export function formatDate(iso: string | null | undefined, lang: Lang): string {
  if (!iso) return "";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(loc(lang), { dateStyle: "medium" }).format(d);
}

export function formatWeekday(iso: string, lang: Lang): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(loc(lang), { weekday: "short", day: "numeric", month: "short" }).format(d);
}

export function formatMonth(month: number, lang: Lang): string {
  return new Intl.DateTimeFormat(loc(lang), { month: "long" }).format(new Date(2024, month - 1, 1));
}

export function formatNumber(n: number, lang: Lang, digits = 0): string {
  return new Intl.NumberFormat(loc(lang), { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n);
}
