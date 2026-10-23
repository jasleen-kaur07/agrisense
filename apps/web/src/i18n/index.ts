import { createI18n } from "vue-i18n";
import en from "./messages/en.json";
import hi from "./messages/hi.json";
import { readStoredLang, type Lang } from "./core";

export const initialLang: Lang = readStoredLang() ?? "en";

/** English is the fallback; a missing key renders as the key itself (never throws). */
export const i18n = createI18n({
  legacy: false,
  locale: initialLang,
  fallbackLocale: "en",
  missingWarn: false,
  fallbackWarn: false,
  warnHtmlMessage: false,
  messages: { en, hi },
});

export const translate = (key: string, params?: Record<string, string | number>): string =>
  params ? i18n.global.t(key, params) : i18n.global.t(key);
