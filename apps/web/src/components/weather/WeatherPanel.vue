<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { Droplets, Wind } from "lucide-vue-next";
import AppCard from "@/components/ui/AppCard.vue";
import WeatherStatusBadge from "./WeatherStatusBadge.vue";
import { formatDateTime, formatNumber, formatWeekday } from "@/lib/format";
import { wmoKey } from "@/lib/wmo";
import type { Lang } from "@/i18n/core";
import type { Weather } from "@/lib/api/types";

/**
 * variant "strip": compact current conditions (overview).
 * variant "full": current + 7-day forecast.
 * When status is UNAVAILABLE no numbers are rendered, whatever the payload holds.
 */
const props = withDefaults(defineProps<{ weather: Weather; variant?: "strip" | "full"; place?: string; snapshot?: boolean }>(), {
  variant: "full",
  snapshot: false,
});
const { t, locale } = useI18n();
const lang = computed(() => locale.value as Lang);
const unavailable = computed(() => props.weather.status === "UNAVAILABLE");
const cur = computed(() => (unavailable.value ? null : props.weather.current));
const daily = computed(() => (unavailable.value ? [] : (props.weather.daily ?? [])));
</script>

<template>
  <AppCard class="border-line bg-blue-soft/60" :aria-label="t('weather.title')">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-blue-ink">
        {{ snapshot ? t("weather.snapshot") : t("weather.title") }}{{ place ? ` · ${place}` : "" }}
      </p>
      <WeatherStatusBadge :status="weather.status" />
    </div>

    <p v-if="unavailable" class="mt-4 text-[15px] text-ink2" data-testid="weather-unavailable">
      {{ weather.message || t("weather.unavailableMessage") }}
    </p>
    <template v-else>
      <div v-if="cur" class="mt-4 flex flex-wrap items-end gap-x-8 gap-y-3">
        <div>
          <p class="font-serif text-5xl leading-none text-blue-ink">
            {{ cur.temperatureC !== undefined ? `${formatNumber(cur.temperatureC, lang, 1)}°C` : "–" }}
          </p>
          <p class="mt-1 text-sm text-ink2">{{ t(wmoKey(cur.weatherCode)) }}</p>
        </div>
        <dl class="flex gap-6 text-sm text-ink2">
          <div v-if="cur.humidityPct !== undefined" class="flex items-center gap-1.5">
            <Droplets aria-hidden="true" class="h-4 w-4 text-blue-ink" />
            <dt class="sr-only">{{ t("weather.humidity") }}</dt>
            <dd>{{ t("weather.humidity") }} {{ formatNumber(cur.humidityPct, lang) }}%</dd>
          </div>
          <div v-if="cur.windKmh !== undefined" class="flex items-center gap-1.5">
            <Wind aria-hidden="true" class="h-4 w-4 text-blue-ink" />
            <dt class="sr-only">{{ t("weather.wind") }}</dt>
            <dd>{{ formatNumber(cur.windKmh, lang) }} km/h</dd>
          </div>
          <div v-if="cur.precipitationMm !== undefined">
            <dt class="inline">{{ t("weather.rain") }}&nbsp;</dt>
            <dd class="inline">{{ formatNumber(cur.precipitationMm, lang, 1) }} mm</dd>
          </div>
        </dl>
      </div>

      <div v-if="variant === 'full' && daily.length > 0" class="mt-6 overflow-x-auto">
        <table class="w-full min-w-[460px] text-left text-sm">
          <caption class="sr-only">{{ t("weather.forecast") }}</caption>
          <thead>
            <tr class="border-b border-blue-ink/20 text-blue-ink">
              <th scope="col" class="py-2 pr-3 font-semibold">{{ t("weather.day") }}</th>
              <th scope="col" class="py-2 pr-3 font-semibold">{{ t("weather.conditions") }}</th>
              <th scope="col" class="py-2 pr-3 font-semibold">{{ t("weather.maxMin") }}</th>
              <th scope="col" class="py-2 font-semibold">{{ t("weather.rainfall") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in daily" :key="d.date" class="border-b border-blue-ink/10">
              <th scope="row" class="py-2 pr-3 font-medium text-ink">{{ formatWeekday(d.date, lang) }}</th>
              <td class="py-2 pr-3">{{ t(wmoKey(d.weatherCode)) }}</td>
              <td class="py-2 pr-3">
                {{ d.tempMaxC !== undefined ? formatNumber(d.tempMaxC, lang) : "–" }}° /
                {{ d.tempMinC !== undefined ? formatNumber(d.tempMinC, lang) : "–" }}°
              </td>
              <td class="py-2">
                {{ d.precipitationSumMm !== undefined ? `${formatNumber(d.precipitationSumMm, lang, 1)} mm` : "–" }}
                {{ d.precipitationProbabilityMaxPct != null ? ` (${formatNumber(d.precipitationProbabilityMaxPct, lang)}%)` : "" }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <p class="mt-4 text-xs text-ink2">
      {{ t("weather.source") }}: {{ weather.source || "Open-Meteo" }} · {{ t("weather.attribution") }}{{
        weather.fetchedAt ? ` · ${t("weather.fetchedAt")}: ${formatDateTime(weather.fetchedAt, lang)}` : ""
      }}
    </p>
  </AppCard>
</template>
