"use client";

import { Droplets, Wind } from "lucide-react";
import { Card } from "@/components/ui/misc";
import { WeatherStatusBadge } from "./WeatherStatusBadge";
import { useI18n } from "@/lib/i18n/provider";
import { formatDateTime, formatNumber, formatWeekday } from "@/lib/format";
import { wmoKey } from "@/lib/wmo";
import type { Weather } from "@/lib/api/types";

/**
 * variant "strip": compact current conditions (overview).
 * variant "full": current + 7-day forecast.
 * When status is UNAVAILABLE no numbers are rendered, whatever the payload holds.
 */
export function WeatherPanel({
  weather,
  variant = "full",
  place,
  snapshot = false,
}: {
  weather: Weather;
  variant?: "strip" | "full";
  place?: string;
  snapshot?: boolean;
}) {
  const { t, lang } = useI18n();
  const unavailable = weather.status === "UNAVAILABLE";
  const cur = !unavailable ? weather.current : null;
  const daily = !unavailable ? (weather.daily ?? []) : [];

  return (
    <Card className="border-line bg-blue-soft/60" aria-label={t("weather.title")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-blue-ink">
          {snapshot ? t("weather.snapshot") : t("weather.title")}
          {place ? ` · ${place}` : ""}
        </p>
        <WeatherStatusBadge status={weather.status} />
      </div>

      {unavailable ? (
        <p className="mt-4 text-[15px] text-ink2" data-testid="weather-unavailable">
          {weather.message || t("weather.unavailableMessage")}
        </p>
      ) : (
        <>
          {cur && (
            <div className="mt-4 flex flex-wrap items-end gap-x-8 gap-y-3">
              <div>
                <p className="font-serif text-5xl leading-none text-blue-ink">
                  {cur.temperatureC !== undefined ? `${formatNumber(cur.temperatureC, lang, 1)}°C` : "–"}
                </p>
                <p className="mt-1 text-sm text-ink2">{t(wmoKey(cur.weatherCode))}</p>
              </div>
              <dl className="flex gap-6 text-sm text-ink2">
                {cur.humidityPct !== undefined && (
                  <div className="flex items-center gap-1.5">
                    <Droplets aria-hidden className="h-4 w-4 text-blue-ink" />
                    <dt className="sr-only">{t("weather.humidity")}</dt>
                    <dd>
                      {t("weather.humidity")} {formatNumber(cur.humidityPct, lang)}%
                    </dd>
                  </div>
                )}
                {cur.windKmh !== undefined && (
                  <div className="flex items-center gap-1.5">
                    <Wind aria-hidden className="h-4 w-4 text-blue-ink" />
                    <dt className="sr-only">{t("weather.wind")}</dt>
                    <dd>{formatNumber(cur.windKmh, lang)} km/h</dd>
                  </div>
                )}
                {cur.precipitationMm !== undefined && (
                  <div>
                    <dt className="inline">{t("weather.rain")} </dt>
                    <dd className="inline">{formatNumber(cur.precipitationMm, lang, 1)} mm</dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {variant === "full" && daily.length > 0 && (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[460px] text-left text-sm">
                <caption className="sr-only">{t("weather.forecast")}</caption>
                <thead>
                  <tr className="border-b border-blue-ink/20 text-blue-ink">
                    <th scope="col" className="py-2 pr-3 font-semibold">{t("weather.day")}</th>
                    <th scope="col" className="py-2 pr-3 font-semibold">{t("weather.conditions")}</th>
                    <th scope="col" className="py-2 pr-3 font-semibold">{t("weather.maxMin")}</th>
                    <th scope="col" className="py-2 font-semibold">{t("weather.rainfall")}</th>
                  </tr>
                </thead>
                <tbody>
                  {daily.map((d) => (
                    <tr key={d.date} className="border-b border-blue-ink/10">
                      <th scope="row" className="py-2 pr-3 font-medium text-ink">{formatWeekday(d.date, lang)}</th>
                      <td className="py-2 pr-3">{t(wmoKey(d.weatherCode))}</td>
                      <td className="py-2 pr-3">
                        {d.tempMaxC !== undefined ? formatNumber(d.tempMaxC, lang) : "–"}° /{" "}
                        {d.tempMinC !== undefined ? formatNumber(d.tempMinC, lang) : "–"}°
                      </td>
                      <td className="py-2">
                        {d.precipitationSumMm !== undefined ? `${formatNumber(d.precipitationSumMm, lang, 1)} mm` : "–"}
                        {d.precipitationProbabilityMaxPct != null
                          ? ` (${formatNumber(d.precipitationProbabilityMaxPct, lang)}%)`
                          : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <p className="mt-4 text-xs text-ink2">
        {t("weather.source")}: {weather.source || "Open-Meteo"} ·{" "}
        {t("weather.attribution")}
        {weather.fetchedAt ? ` · ${t("weather.fetchedAt")}: ${formatDateTime(weather.fetchedAt, lang)}` : ""}
      </p>
    </Card>
  );
}
