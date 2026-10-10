"use client";

import { useI18n } from "@/lib/i18n/provider";
import { formatMonth } from "@/lib/format";
import { useSeason } from "@/lib/hooks/queries";
import { QueryState } from "@/components/data/states";
import { Card, PageHeader } from "@/components/ui/misc";

export function SeasonPage() {
  const { t, lang } = useI18n();
  const q = useSeason();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader kicker={t("nav.more")} title={t("seasonPage.title")} lead={t("seasonPage.lead")} />
      <QueryState query={q}>
        {(s) => (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="bg-ochre-soft">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ochre-ink">{t("seasonPage.current")}</p>
                <p className="mt-2 font-serif text-3xl text-forest">{t(`season.${s.season}`)}</p>
                <p className="mt-2 text-sm text-ink2">{s.months.map((m) => formatMonth(m, lang)).join(", ")}</p>
              </Card>
              <Card>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-olive-ink">{t("seasonPage.next")}</p>
                <p className="mt-2 font-serif text-3xl text-forest">{t(`season.${s.next}`)}</p>
              </Card>
            </div>
            <Card className="bg-sage2">
              <h2 className="mb-2 text-xl">{t("seasonPage.ruleTitle")}</h2>
              <p className="leading-relaxed text-ink2">{s.rule}</p>
              <p className="mt-3 text-sm text-ink2">{t("seasonPage.ruleNote")}</p>
            </Card>
          </div>
        )}
      </QueryState>
    </div>
  );
}
