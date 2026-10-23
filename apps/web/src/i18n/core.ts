export type Lang = "en" | "hi";
export const LANGS: Lang[] = ["en", "hi"];
export const LANG_COOKIE = "as_lang";
export const LANG_STORAGE = "as_lang";

export type Messages = { [key: string]: string | Messages };

export function isLang(v: unknown): v is Lang {
  return v === "en" || v === "hi";
}

/** Dotted-key lookup (used by tests that check key usage and parity). */
export function lookup(messages: Messages, key: string): string | undefined {
  let cur: string | Messages | undefined = messages;
  for (const part of key.split(".")) {
    if (cur && typeof cur === "object") cur = cur[part];
    else return undefined;
  }
  return typeof cur === "string" ? cur : undefined;
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

/** The language chosen earlier (cookie first, localStorage fallback), or null when never chosen. */
export function readStoredLang(): Lang | null {
  try {
    for (const part of document.cookie.split(";")) {
      const [k, v] = part.trim().split("=");
      if (k === LANG_COOKIE && isLang(v)) return v;
    }
  } catch {
    /* cookies unavailable */
  }
  try {
    const stored = localStorage.getItem(LANG_STORAGE);
    if (isLang(stored)) return stored;
  } catch {
    /* storage unavailable */
  }
  return null;
}

export function persistLang(lang: Lang) {
  try {
    document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax`;
  } catch {
    /* cookies unavailable */
  }
  try {
    localStorage.setItem(LANG_STORAGE, lang);
  } catch {
    /* storage unavailable */
  }
}
