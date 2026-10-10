export type Lang = "en" | "hi";
export const LANGS: Lang[] = ["en", "hi"];
export const LANG_COOKIE = "as_lang";
export const LANG_STORAGE = "as_lang";

export type Messages = { [key: string]: string | Messages };

export function isLang(v: unknown): v is Lang {
  return v === "en" || v === "hi";
}

export function lookup(messages: Messages, key: string): string | undefined {
  let cur: string | Messages | undefined = messages;
  for (const part of key.split(".")) {
    if (cur && typeof cur === "object") cur = cur[part];
    else return undefined;
  }
  return typeof cur === "string" ? cur : undefined;
}

export function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m));
}

export function translate(
  messages: Messages,
  fallback: Messages,
  key: string,
  params?: Record<string, string | number>,
): string {
  const found = lookup(messages, key) ?? lookup(fallback, key) ?? key;
  return interpolate(found, params);
}

/** Flatten nested messages to dotted keys (used by the parity test). */
export function flatten(m: Messages, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(m)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") out[key] = v;
    else Object.assign(out, flatten(v, key));
  }
  return out;
}
