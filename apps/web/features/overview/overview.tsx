"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { MapPin } from "lucide-react";
import { regional, weather as weatherApi } from "@/lib/api/endpoints";
import { useI18n } from "@/lib/i18n/provider";
import { formatNumber } from "@/lib/format";
import { useHomeLocation, useMe, useSeason } from "@/lib/hooks/queries";
import { ErrorPanel, QueryState, SkeletonBlock } from "@/components/data/states";
import { LinkButton } from "@/components/ui/button";
import { Card, Kicker } from "@/components/ui/misc";
import { WeatherPanel } from "@/components/weather/WeatherPanel";
import { INSIGHTS_MENU } from "@/components/layout/nav-config";

export function Overview() {
  const { t, lang } = useI18n();
  const me = useMe();
  const { location, pending, error } = useHomeLocation();
  const seasonQ = useSeason();
  const season = seasonQ.data?.season;

  const weatherQ = useQuery({
    queryKey: ["weather", location?.stateKey, location?.districtKey],
    queryFn: () => weatherApi.get(location!.stateKey, location!.districtKey),
    enabled: !!location,
  });
  const guideQ = useQuery({
    queryKey: ["guide", location?.stateKey, location?.districtKey, season],
    queryFn: () => regional.guide(location!.stateKey, location!.districtKey, season!),
    enabled: !!location && !!season,
  });

  const name = me.data?.displayName;
  const place = location?.district ? `${location.district}, ${location.state ?? ""}`.replace(/, $/, "") : null;

  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Kicker className="mb-2">{t("overview.kicker")}</Kicker>
          <h1 className="text-3xl sm:text-4xl">{name ? t("overview.greetingName", { name }) : t("overview.greeting")}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink2">
            {place && (
              <span className="inline-flex items-center gap-1.5"><MapPin aria-hidden className="h-4 w-4 text-olive-ink" />{place}</span>
            )}
            {season && <span>{t("overview.season", { season: t(`season.${season}`) })}</span>}
          </p>
        </div>
        <LinkButton href="/crop-advice" className="self-start sm:self-auto">{t("overview.cta")}</LinkButton>
      </header>

      {pending ? (
        <SkeletonBlock rows={3} />
      ) : error ? (
        <ErrorPanel error={error} />
      ) : !location ? (
        <Card>
          <h2 className="mb-2 text-2xl">{t("overview.noLocationTitle")}</h2>
          <p className="mb-4 text-ink2">{t("overview.noLocationBody")}</p>
          <LinkButton href="/more/settings" variant="secondary">{t("overview.openSettings")}</LinkButton>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <section aria-labelledby="ov-weather">
            <h2 id="ov-weather" className="sr-only">{t("weather.title")}</h2>
            <QueryState query={weatherQ}>
              {(w) => (
                <div className="space-y-2">
                  <WeatherPanel weather={w} variant="strip" place={location.district} />
                  <Link href="/insights/weather" className="inline-flex min-h-11 items-center text-sm text-olive-ink underline">{t("overview.fullForecast")}</Link>
                </div>
              )}
            </QueryState>
          </section>

          <section aria-labelledby="ov-guide">
            <Card>
              <Kicker className="mb-1">{t("guide.kicker")}</Kicker>
              <h2 id="ov-guide" className="mb-3 text-2xl">{t("overview.teaserTitle")}</h2>
              <QueryState query={guideQ} isEmpty={(g) => g.crops.length === 0} empty={<p className="text-ink2">{t("guide.noCrops")}</p>}>
                {(g) => (
                  <>
                    <ol className="divide-y divide-line border-y border-line">
                      {g.crops.slice(0, 3).map((c) => (
                        <li key={c.crop} className="flex items-baseline justify-between gap-3 py-3">
                          <span className="font-semibold text-ink">{c.rank}. {c.crop}</span>
                          <span className="text-sm text-ink2">{formatNumber(c.prevalencePct, lang, 1)}% {t("guide.prevalenceShort")}</span>
                        </li>
                      ))}
                    </ol>
                    <p className="mt-3 text-xs text-ink2">{t("overview.teaserNote")}</p>
                    <Link href="/more/regional" className="mt-2 inline-flex min-h-11 items-center text-sm text-olive-ink underline">{t("overview.fullGuide")}</Link>
                  </>
                )}
              </QueryState>
            </Card>
          </section>
        </div>
      )}

      <section aria-labelledby="ov-insights">
        <Kicker className="mb-1">{t("nav.insights")}</Kicker>
        <h2 id="ov-insights" className="mb-4 text-2xl">{t("overview.insightsTitle")}</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {INSIGHTS_MENU.map((i) => (
            <li key={i.href}>
              <Link href={i.href} className="flex h-full min-h-24 flex-col justify-between rounded-[10px] border border-line bg-surface p-4 hover:border-line-dark">
                <span className="font-serif text-xl text-forest">{t(i.key)}</span>
                <span className="mt-2 text-sm text-ink2">{t(`${i.key}Desc`)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
