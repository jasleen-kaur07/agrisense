"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import en from "@/messages/en.json";
import hi from "@/messages/hi.json";
import { LANG_COOKIE, LANG_STORAGE, isLang, translate, type Lang, type Messages } from "./core";

const CATALOG: Record<Lang, Messages> = { en: en as Messages, hi: hi as Messages };

interface I18nValue {
  lang: Lang;
  t: (key: string, params?: Record<string, string | number>) => string;
  /** Switch language locally; persistence to the profile is done by the caller. */
  setLang: (lang: Lang) => void;
  /** True once the user (or the stored cookie) has chosen a language explicitly. */
  hasExplicitChoice: boolean;
}

const I18nContext = createContext<I18nValue | null>(null);

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

export function I18nProvider({ initialLang, explicit, children }: { initialLang: Lang; explicit: boolean; children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const [hasExplicitChoice, setExplicit] = useState(explicit);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // Fallback: if the cookie is missing but localStorage remembers a choice.
  useEffect(() => {
    if (explicit) return;
    try {
      const stored = localStorage.getItem(LANG_STORAGE);
      if (isLang(stored)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLangState(stored);
        setExplicit(true);
      }
    } catch {
      /* ignore */
    }
  }, [explicit]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    setExplicit(true);
    persistLang(next);
  }, []);

  const value = useMemo<I18nValue>(
    () => ({
      lang,
      setLang,
      hasExplicitChoice,
      t: (key, params) => translate(CATALOG[lang], CATALOG.en, key, params),
    }),
    [lang, setLang, hasExplicitChoice],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Allows isolated component tests without a provider (English).
    return {
      lang: "en",
      t: (key, params) => translate(CATALOG.en, CATALOG.en, key, params),
      setLang: () => {},
      hasExplicitChoice: false,
    };
  }
  return ctx;
}

export function useT() {
  return useI18n().t;
}
