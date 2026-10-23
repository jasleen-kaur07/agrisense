<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { Info } from "lucide-vue-next";
import AppCard from "@/components/ui/AppCard.vue";
import KickerText from "@/components/ui/KickerText.vue";
import { formatNumber } from "@/lib/format";
import type { Lang } from "@/i18n/core";
import type { RegionalCrop, RegionalGuide as Guide } from "@/lib/api/types";

/**
 * Renders the API's regional guide verbatim: historical prevalence, coverage and caveats.
 * No scoring or ranking logic lives here; `rank` and percentages come from the API.
 */
const props = withDefaults(defineProps<{ guide: Guide; limitations?: string[]; limit?: number }>(), { limitations: () => [] });
defineSlots<{ "crop-action"(p: { crop: RegionalCrop }): unknown }>();

const { t, locale } = useI18n();
const lang = computed(() => locale.value as Lang);
const crops = computed(() => (props.limit ? props.guide.crops.slice(0, props.limit) : props.guide.crops));
const cov = computed(() => props.guide.coverage);
const caveats = computed(() => [...props.guide.caveats, ...props.limitations.filter((l) => !props.guide.caveats.includes(l))]);
const barWidth = (pct: number) => `${Math.min(100, Math.max(0, pct))}%`;
</script>

<template>
  <div class="space-y-6">
    <section aria-labelledby="guide-crops">
      <KickerText class="mb-1">{{ t("guide.kicker") }}</KickerText>
      <h2 id="guide-crops" class="text-2xl">
        {{ t("guide.heading", { district: guide.district, season: t(`season.${guide.season}`) }) }}
      </h2>
      <p class="mt-1 text-sm text-ink2">{{ t("guide.subheading") }}</p>

      <AppCard v-if="crops.length === 0" class="mt-4"><p class="text-ink2">{{ t("guide.noCrops") }}</p></AppCard>
      <ol v-else class="mt-5 divide-y divide-line border-y border-line" data-testid="guide-crops">
        <li v-for="c in crops" :key="c.crop" class="grid gap-2 py-4 sm:grid-cols-[2.5rem_1fr_auto] sm:items-center sm:gap-4">
          <span class="font-serif text-2xl text-olive-ink" :aria-label="t('guide.rank', { n: c.rank })">{{ c.rank }}</span>
          <div>
            <p class="font-semibold text-ink">{{ c.crop }}</p>
            <div class="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-sage" aria-hidden="true">
              <div class="h-full rounded-full bg-olive-ink" :style="{ width: barWidth(c.prevalencePct) }"></div>
            </div>
            <p class="mt-1.5 text-xs text-ink2">
              {{
                c.districtPct != null
                  ? t("guide.districtState", { district: formatNumber(c.districtPct, lang, 1), state: formatNumber(c.statePct, lang, 1) })
                  : t("guide.stateOnly", { state: formatNumber(c.statePct, lang, 1) })
              }}
            </p>
          </div>
          <div class="flex items-center justify-between gap-4 sm:flex-col sm:items-end sm:gap-2">
            <p class="text-right">
              <span class="font-serif text-2xl text-forest">{{ formatNumber(c.prevalencePct, lang, 1) }}%</span>
              <span class="block text-xs text-ink2">{{ t("guide.prevalenceLabel") }}</span>
            </p>
            <slot name="crop-action" :crop="c" />
          </div>
        </li>
      </ol>
    </section>

    <section v-if="guide.yearRoundCrops && guide.yearRoundCrops.length > 0" aria-labelledby="guide-year">
      <h3 id="guide-year" class="text-xl">{{ t("guide.yearRound") }}</h3>
      <p class="mt-1 text-sm text-ink2">{{ t("guide.yearRoundNote") }}</p>
      <ul class="mt-3 flex flex-wrap gap-2">
        <li v-for="c in guide.yearRoundCrops" :key="c" class="rounded-full bg-ochre-soft px-3 py-1 text-sm text-ochre-ink">{{ c }}</li>
      </ul>
    </section>

    <section aria-labelledby="guide-coverage">
      <AppCard>
        <h3 id="guide-coverage" class="mb-3 text-xl">{{ t("guide.coverage") }}</h3>
        <dl class="grid gap-4 text-sm sm:grid-cols-4">
          <div>
            <dt class="text-muted">{{ t("guide.districtRecords") }}</dt>
            <dd class="font-serif text-2xl text-forest">{{ formatNumber(cov.districtRecords, lang) }}</dd>
          </div>
          <div>
            <dt class="text-muted">{{ t("guide.yearsCovered") }}</dt>
            <dd class="font-serif text-2xl text-forest">
              {{ cov.yearsCovered.length }}
              <span class="ml-2 font-sans text-sm text-ink2">{{ cov.firstYear }}–{{ cov.lastYear }}</span>
            </dd>
          </div>
          <div>
            <dt class="text-muted">{{ t("guide.districtWeight") }}</dt>
            <dd class="font-serif text-2xl text-forest">{{ formatNumber(cov.districtWeight * 100, lang) }}%</dd>
          </div>
          <div>
            <dt class="text-muted">{{ t("guide.basis") }}</dt>
            <dd class="text-ink2">{{ guide.basis }}</dd>
          </div>
        </dl>
        <p v-if="cov.stateFallbackUsed" role="note" class="mt-4 flex gap-2 rounded-lg bg-ochre-soft px-3 py-2 text-sm text-ochre-ink">
          <Info aria-hidden="true" class="mt-0.5 h-4 w-4 shrink-0" />
          {{ t("guide.stateFallback", { district: guide.district, state: guide.state }) }}
        </p>
      </AppCard>
    </section>

    <section v-if="caveats.length > 0" aria-labelledby="guide-caveats">
      <h3 id="guide-caveats" class="text-xl">{{ t("guide.caveats") }}</h3>
      <ul class="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ink2">
        <li v-for="c in caveats" :key="c">{{ c }}</li>
      </ul>
    </section>

    <p v-if="guide.sources && guide.sources.length > 0" class="text-xs text-muted">{{ t("guide.sources") }}: {{ guide.sources.join("; ") }}</p>
  </div>
</template>
