import { ref } from "vue";
import { defineStore } from "pinia";
import { i18n, initialLang } from "@/i18n";
import { persistLang, readStoredLang, type Lang } from "@/i18n/core";

/** UI language. `explicit` is true once the visitor (or a stored cookie) chose a language. */
export const useLocaleStore = defineStore("locale", () => {
  const lang = ref<Lang>(initialLang);
  const explicit = ref(readStoredLang() !== null);

  function apply(next: Lang) {
    lang.value = next;
    i18n.global.locale.value = next;
    document.documentElement.lang = next;
  }
  apply(lang.value);

  /** Switch locally; saving to the profile is the caller's job. */
  function setLang(next: Lang) {
    apply(next);
    explicit.value = true;
    persistLang(next);
  }

  /** Follow the signed-in user's saved language unless the visitor already chose one. */
  function adoptUserLang(next: Lang) {
    if (!explicit.value && next !== lang.value) setLang(next);
  }

  return { lang, explicit, setLang, adoptUserLang };
});
