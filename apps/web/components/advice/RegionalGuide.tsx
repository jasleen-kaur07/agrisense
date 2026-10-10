"use client";

import type { ReactNode } from "react";
import { Info } from "lucide-react";
import { Card, Kicker } from "@/components/ui/misc";
import { useI18n } from "@/lib/i18n/provider";
import { formatNumber } from "@/lib/format";
import type { RegionalCrop, RegionalGuide as Guide } from "@/lib/api/types";

/**
 * Renders the API's regional guide verbatim: historical prevalence, coverage and caveats.
 * No scoring or ranking logic lives here; `rank` and percentages come from the API.
 */
export function RegionalGuide({
  guide,
  limitations = [],
  renderCropAction,
  limit,
}: {
  guide: Guide;
  limitations?: string[];
  renderCropAction?: (crop: RegionalCrop) => ReactNode;
  limit?: number;
}) {
  const { t, lang } = useI18n();
  const crops = limit ? guide.crops.slice(0, limit) : guide.crops;
  const cov = guide.coverage;
  const caveats = [...guide.caveats, ...limitations.filter((l) => !guide.caveats.includes(l))];

  return (
    <div className="space-y-6">
      <section aria-labelledby="guide-crops">
        <Kicker className="mb-1">{t("guide.kicker")}</Kicker>
        <h2 id="guide-crops" className="text-2xl">
          {t("guide.heading", { district: guide.district, season: t(`season.${guide.season}`) })}
        </h2>
        <p className="mt-1 text-sm text-ink2">{t("guide.subheading")}</p>

        {crops.length === 0 ? (
          <Card className="mt-4"><p className="text-ink2">{t("guide.noCrops")}</p></Card>
        ) : (
          <ol className="mt-5 divide-y divide-line border-y border-line" data-testid="guide-crops">
            {crops.map((c) => (
              <li key={c.crop} className="grid gap-2 py-4 sm:grid-cols-[2.5rem_1fr_auto] sm:items-center sm:gap-4">
                <span className="font-serif text-2xl text-olive-ink" aria-label={t("guide.rank", { n: c.rank })}>{c.rank}</span>
                <div>
                  <p className="font-semibold text-ink">{c.crop}</p>
                  <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-sage" aria-hidden="true">
                    <div className="h-full rounded-full bg-olive-ink" style={{ width: `${Math.min(100, Math.max(0, c.prevalencePct))}%` }} />
                  </div>
                  <p className="mt-1.5 text-xs text-ink2">
                    {c.districtPct != null
                      ? t("guide.districtState", { district: formatNumber(c.districtPct, lang, 1), state: formatNumber(c.statePct, lang, 1) })
                      : t("guide.stateOnly", { state: formatNumber(c.statePct, lang, 1) })}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end sm:gap-2">
                  <p className="text-right">
                    <span className="font-serif text-2xl text-forest">{formatNumber(c.prevalencePct, lang, 1)}%</span>
                    <span className="block text-xs text-ink2">{t("guide.prevalenceLabel")}</span>
                  </p>
                  {renderCropAction?.(c)}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {guide.yearRoundCrops && guide.yearRoundCrops.length > 0 && (
        <section aria-labelledby="guide-year">
          <h3 id="guide-year" className="text-xl">{t("guide.yearRound")}</h3>
          <p className="mt-1 text-sm text-ink2">{t("guide.yearRoundNote")}</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {guide.yearRoundCrops.map((c) => (
              <li key={c} className="rounded-full bg-ochre-soft px-3 py-1 text-sm text-ochre-ink">{c}</li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="guide-coverage">
        <Card>
          <h3 id="guide-coverage" className="mb-3 text-xl">{t("guide.coverage")}</h3>
          <dl className="grid gap-4 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-muted">{t("guide.districtRecords")}</dt>
              <dd className="font-serif text-2xl text-forest">{formatNumber(cov.districtRecords, lang)}</dd>
            </div>
            <div>
              <dt className="text-muted">{t("guide.yearsCovered")}</dt>
              <dd className="font-serif text-2xl text-forest">
                {cov.yearsCovered.length}
                <span className="ml-2 font-sans text-sm text-ink2">{cov.firstYear}–{cov.lastYear}</span>
              </dd>
            </div>
            <div>
              <dt className="text-muted">{t("guide.districtWeight")}</dt>
              <dd className="font-serif text-2xl text-forest">{formatNumber(cov.districtWeight * 100, lang)}%</dd>
            </div>
            <div>
              <dt className="text-muted">{t("guide.basis")}</dt>
              <dd className="text-ink2">{guide.basis}</dd>
            </div>
          </dl>
          {cov.stateFallbackUsed && (
            <p role="note" className="mt-4 flex gap-2 rounded-lg bg-ochre-soft px-3 py-2 text-sm text-ochre-ink">
              <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
              {t("guide.stateFallback", { district: guide.district, state: guide.state })}
            </p>
          )}
        </Card>
      </section>

      {caveats.length > 0 && (
        <section aria-labelledby="guide-caveats">
          <h3 id="guide-caveats" className="text-xl">{t("guide.caveats")}</h3>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ink2">
            {caveats.map((c) => <li key={c}>{c}</li>)}
          </ul>
        </section>
      )}

      {guide.sources && guide.sources.length > 0 && (
        <p className="text-xs text-muted">{t("guide.sources")}: {guide.sources.join("; ")}</p>
      )}
    </div>
  );
}
