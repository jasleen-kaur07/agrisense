<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { useI18n } from "vue-i18n";
import { MapPin } from "lucide-vue-next";
import { regional, weather as weatherApi } from "@/lib/api/endpoints";
import type { Lang } from "@/i18n/core";
import { formatNumber } from "@/lib/format";
import { useQuery } from "@/lib/query";
import { useHomeLocation, useSeason } from "@/composables/queries";
import { useSessionStore } from "@/stores/session";
import ErrorPanel from "@/components/data/ErrorPanel.vue";
import QueryState from "@/components/data/QueryState.vue";
import SkeletonBlock from "@/components/data/SkeletonBlock.vue";
import AppCard from "@/components/ui/AppCard.vue";
import KickerText from "@/components/ui/KickerText.vue";
import LinkButton from "@/components/ui/LinkButton.vue";
import WeatherPanel from "@/components/weather/WeatherPanel.vue";
import { INSIGHTS_MENU } from "@/components/layout/nav-config";

const { t, locale } = useI18n();
const lang = computed(() => locale.value as Lang);
const session = useSessionStore();
const { location, pending, error } = useHomeLocation();
const seasonQ = useSeason();
const season = computed(() => seasonQ.data?.season);

const weatherQ = useQuery(
  () => ["weather", location.value?.stateKey, location.value?.districtKey],
  () => weatherApi.get(location.value!.stateKey, location.value!.districtKey),
  { enabled: () => !!location.value },
);
const guideQ = useQuery(
  () => ["guide", location.value?.stateKey, location.value?.districtKey, season.value],
  () => regional.guide(location.value!.stateKey, location.value!.districtKey, season.value!),
  { enabled: () => !!location.value && !!season.value },
);

const name = computed(() => session.user?.displayName);
const place = computed(() =>
  location.value?.district ? `${location.value.district}, ${location.value.state ?? ""}`.replace(/, $/, "") : null,
);
</script>

<template>
  <div class="space-y-10">
    <header class="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <KickerText class="mb-2">{{ t("overview.kicker") }}</KickerText>
        <h1 class="text-3xl sm:text-4xl">{{ name ? t("overview.greetingName", { name }) : t("overview.greeting") }}</h1>
        <p class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink2">
          <span v-if="place" class="inline-flex items-center gap-1.5"><MapPin aria-hidden="true" class="h-4 w-4 text-olive-ink" />{{ place }}</span>
          <span v-if="season">{{ t("overview.season", { season: t(`season.${season}`) }) }}</span>
        </p>
      </div>
      <LinkButton to="/crop-advice" class="self-start sm:self-auto">{{ t("overview.cta") }}</LinkButton>
    </header>

    <SkeletonBlock v-if="pending" :rows="3" />
    <ErrorPanel v-else-if="error" :error="error" />
    <AppCard v-else-if="!location">
      <h2 class="mb-2 text-2xl">{{ t("overview.noLocationTitle") }}</h2>
      <p class="mb-4 text-ink2">{{ t("overview.noLocationBody") }}</p>
      <LinkButton to="/more/settings" variant="secondary">{{ t("overview.openSettings") }}</LinkButton>
    </AppCard>
    <div v-else class="grid gap-6 lg:grid-cols-2">
      <section aria-labelledby="ov-weather">
        <h2 id="ov-weather" class="sr-only">{{ t("weather.title") }}</h2>
        <QueryState :query="weatherQ">
          <template #default="{ data: w }">
            <div class="space-y-2">
              <WeatherPanel :weather="w" variant="strip" :place="location.district" />
              <RouterLink to="/insights/weather" class="inline-flex min-h-11 items-center text-sm text-olive-ink underline">{{ t("overview.fullForecast") }}</RouterLink>
            </div>
          </template>
        </QueryState>
      </section>

      <section aria-labelledby="ov-guide">
        <AppCard>
          <KickerText class="mb-1">{{ t("guide.kicker") }}</KickerText>
          <h2 id="ov-guide" class="mb-3 text-2xl">{{ t("overview.teaserTitle") }}</h2>
          <QueryState :query="guideQ" :is-empty="(g) => g.crops.length === 0">
            <template #empty><p class="text-ink2">{{ t("guide.noCrops") }}</p></template>
            <template #default="{ data: g }">
              <ol class="divide-y divide-line border-y border-line">
                <li v-for="c in g.crops.slice(0, 3)" :key="c.crop" class="flex items-baseline justify-between gap-3 py-3">
                  <span class="font-semibold text-ink">{{ c.rank }}. {{ c.crop }}</span>
                  <span class="text-sm text-ink2">{{ formatNumber(c.prevalencePct, lang, 1) }}% {{ t("guide.prevalenceShort") }}</span>
                </li>
              </ol>
              <p class="mt-3 text-xs text-ink2">{{ t("overview.teaserNote") }}</p>
              <RouterLink to="/more/regional" class="mt-2 inline-flex min-h-11 items-center text-sm text-olive-ink underline">{{ t("overview.fullGuide") }}</RouterLink>
            </template>
          </QueryState>
        </AppCard>
      </section>
    </div>

    <section aria-labelledby="ov-insights">
      <KickerText class="mb-1">{{ t("nav.insights") }}</KickerText>
      <h2 id="ov-insights" class="mb-4 text-2xl">{{ t("overview.insightsTitle") }}</h2>
      <ul class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <li v-for="i in INSIGHTS_MENU" :key="i.href">
          <RouterLink :to="i.href" class="flex h-full min-h-24 flex-col justify-between rounded-[10px] border border-line bg-surface p-4 hover:border-line-dark">
            <span class="font-serif text-xl text-forest">{{ t(i.key) }}</span>
            <span class="mt-2 text-sm text-ink2">{{ t(`${i.key}Desc`) }}</span>
          </RouterLink>
        </li>
      </ul>
    </section>
  </div>
</template>
