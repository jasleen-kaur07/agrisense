"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { profile } from "@/lib/api/endpoints";
import { useI18n } from "@/lib/i18n/provider";
import { qk } from "@/lib/hooks/queries";
import type { Lang } from "@/lib/i18n/core";
import { cn } from "@/lib/cn";

/** Switches UI language immediately (cookie + localStorage); signed-in users also persist it to /profile. */
export function LanguageSwitcher({ signedIn = false }: { signedIn?: boolean }) {
  const { lang, setLang, t } = useI18n();
  const qc = useQueryClient();
  const save = useMutation({
    mutationFn: (l: Lang) => profile.update({ language: l }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.profile });
      void qc.invalidateQueries({ queryKey: qk.me });
    },
  });
  const choose = (l: Lang) => {
    if (l === lang) return;
    setLang(l);
    if (signedIn) save.mutate(l);
  };
  return (
    <div role="group" aria-label={t("language.label")} className="inline-flex rounded-lg border border-line-dark bg-surface p-0.5">
      {(["en", "hi"] as const).map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          aria-pressed={lang === l}
          onClick={() => choose(l)}
          className={cn(
            "min-h-10 min-w-11 rounded-md px-3 text-sm font-semibold",
            lang === l ? "bg-forest text-surface" : "text-forest hover:bg-sage2",
          )}
        >
          {l === "en" ? "EN" : "हिं"}
        </button>
      ))}
    </div>
  );
}
