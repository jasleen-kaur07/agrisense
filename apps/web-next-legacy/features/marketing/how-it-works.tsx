"use client";

import { useT } from "@/lib/i18n/provider";
import { LinkButton } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/misc";

export function HowItWorks() {
  const t = useT();
  const sections = ["what", "data", "weather", "soil", "limits"] as const;
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader kicker={t("how.kicker")} title={t("how.title")} lead={t("how.lead")} />
      <div className="space-y-8">
        {sections.map((s) => (
          <section key={s} aria-labelledby={`how-${s}`} className="border-b border-line pb-6">
            <h2 id={`how-${s}`} className="mb-2 text-2xl">{t(`how.${s}Title`)}</h2>
            <p className="leading-relaxed text-ink2">{t(`how.${s}Body`)}</p>
          </section>
        ))}
      </div>
      <div className="mt-8">
        <LinkButton href="/register">{t("landing.cta")}</LinkButton>
      </div>
    </div>
  );
}
