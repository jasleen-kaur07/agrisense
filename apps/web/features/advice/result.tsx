"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";
import { formatDateTime } from "@/lib/format";
import { useRecommendation } from "./hooks";
import { QueryState } from "@/components/data/states";
import { LinkButton } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/misc";
import { RegionalGuide } from "@/components/advice/RegionalGuide";
import { WeatherPanel } from "@/components/weather/WeatherPanel";
import { buttonClass } from "@/components/ui/button";
import type { Recommendation } from "@/lib/api/types";

export function ResultSummaryLine({ rec }: { rec: Recommendation }) {
  const { t, lang } = useI18n();
  const place = [rec.location.district ?? rec.regional.district, rec.location.state ?? rec.regional.state].filter(Boolean).join(", ");
  return (
    <>
      {[rec.fieldName, place, t(`season.${rec.season}`), formatDateTime(rec.createdAt, lang)].filter(Boolean).join(" · ")}
    </>
  );
}

export function ResultPage({ id }: { id: string }) {
  const { t } = useI18n();
  const q = useRecommendation(id);
  return (
    <QueryState query={q}>
      {(rec) => (
        <div>
          <Link href="/crop-advice" className="mb-4 inline-flex min-h-11 items-center gap-1 text-sm text-olive-ink underline">
            <ArrowLeft aria-hidden className="h-4 w-4" />{t("result.newGuide")}
          </Link>
          <PageHeader
            kicker={t("result.kicker")}
            title={t("result.title")}
            lead={<ResultSummaryLine rec={rec} />}
            actions={
              <>
                <LinkButton href={`/crop-advice/result/${id}/why`} variant="secondary">{t("result.why")}</LinkButton>
                <LinkButton href={`/crop-advice/result/${id}/compare`} variant="secondary">{t("result.compare")}</LinkButton>
                <LinkButton href="/more/history" variant="ghost">{t("result.history")}</LinkButton>
              </>
            }
          />
          <p className="mb-6 text-sm text-ink2">{t("result.savedAuto")}</p>
          <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
            <RegionalGuide
              guide={rec.regional}
              limitations={rec.limitations}
              renderCropAction={(c) => (
                <Link
                  href={`/crop-advice/result/${id}/action-plan?crop=${encodeURIComponent(c.crop)}`}
                  className={buttonClass("secondary", "min-h-11 px-3 text-sm")}
                  aria-label={t("result.actionPlanFor", { crop: c.crop })}
                >
                  {t("result.actionPlan")}
                </Link>
              )}
            />
            <div className="space-y-4">
              <WeatherPanel weather={rec.weather} variant="strip" snapshot place={rec.location.district} />
              <p className="text-sm text-ink2">{t("result.soilNote")}</p>
            </div>
          </div>
        </div>
      )}
    </QueryState>
  );
}
