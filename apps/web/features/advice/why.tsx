"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";
import { formatNumber } from "@/lib/format";
import { useRecommendation } from "./hooks";
import { QueryState } from "@/components/data/states";
import { Card, PageHeader } from "@/components/ui/misc";

export function WhyPage({ id }: { id: string }) {
  const { t, lang } = useI18n();
  const q = useRecommendation(id);
  return (
    <QueryState query={q}>
      {(rec) => {
        const g = rec.regional;
        const cov = g.coverage;
        return (
          <div className="mx-auto max-w-3xl">
            <Link href={`/crop-advice/result/${id}`} className="mb-4 inline-flex min-h-11 items-center gap-1 text-sm text-olive-ink underline">
              <ArrowLeft aria-hidden className="h-4 w-4" />{t("why.back")}
            </Link>
            <PageHeader kicker={t("why.kicker")} title={t("why.title")} lead={t("why.lead")} />
            <div className="space-y-6">
              <section aria-labelledby="why-method">
                <h2 id="why-method" className="mb-2 text-2xl">{t("why.methodTitle")}</h2>
                <p className="leading-relaxed text-ink2">{t("why.methodBody", { basis: g.basis })}</p>
              </section>
              <section aria-labelledby="why-weight">
                <h2 id="why-weight" className="mb-2 text-2xl">{t("why.weightTitle")}</h2>
                <p className="leading-relaxed text-ink2">
                  {t("why.weightBody", {
                    weight: formatNumber(cov.districtWeight * 100, lang),
                    records: formatNumber(cov.districtRecords, lang),
                    first: cov.firstYear,
                    last: cov.lastYear,
                    years: cov.yearsCovered.length,
                  })}
                </p>
                {cov.stateFallbackUsed && <p className="mt-2 leading-relaxed text-ink2">{t("why.fallbackBody", { state: g.state })}</p>}
              </section>
              <section aria-labelledby="why-recency">
                <h2 id="why-recency" className="mb-2 text-2xl">{t("why.recencyTitle")}</h2>
                <p className="leading-relaxed text-ink2">{t("why.recencyBody")}</p>
              </section>
              <Card className="bg-sage2">
                <h2 className="mb-2 text-2xl">{t("why.notTitle")}</h2>
                <ul className="list-disc space-y-1.5 pl-5 text-ink2">
                  <li>{t("why.not1")}</li>
                  <li>{t("why.not2")}</li>
                  <li>{t("why.not3")}</li>
                </ul>
              </Card>
              <section aria-labelledby="why-limits">
                <h2 id="why-limits" className="mb-2 text-2xl">{t("guide.caveats")}</h2>
                <ul className="list-disc space-y-1.5 pl-5 text-sm text-ink2">
                  {[...g.caveats, ...rec.limitations.filter((l) => !g.caveats.includes(l))].map((c) => <li key={c}>{c}</li>)}
                </ul>
              </section>
            </div>
          </div>
        );
      }}
    </QueryState>
  );
}
