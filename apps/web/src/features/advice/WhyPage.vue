<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { formatNumber } from "@/lib/format";
import type { Lang } from "@/i18n/core";
import { useRecommendation } from "@/composables/useRecommendation";
import QueryState from "@/components/data/QueryState.vue";
import AppCard from "@/components/ui/AppCard.vue";
import PageHeader from "@/components/ui/PageHeader.vue";
import BackLink from "./BackLink.vue";

const props = defineProps<{ id: string }>();
const { t, locale } = useI18n();
const q = useRecommendation(() => props.id);
const lang = () => locale.value as Lang;
</script>

<template>
  <QueryState :query="q">
    <template #default="{ data: rec }">
      <div class="mx-auto max-w-3xl">
        <BackLink :to="`/crop-advice/result/${id}`">{{ t("why.back") }}</BackLink>
        <PageHeader :kicker="t('why.kicker')" :title="t('why.title')" :lead="t('why.lead')" />
        <div class="space-y-6">
          <section aria-labelledby="why-method">
            <h2 id="why-method" class="mb-2 text-2xl">{{ t("why.methodTitle") }}</h2>
            <p class="leading-relaxed text-ink2">{{ t("why.methodBody", { basis: rec.regional.basis }) }}</p>
          </section>
          <section aria-labelledby="why-weight">
            <h2 id="why-weight" class="mb-2 text-2xl">{{ t("why.weightTitle") }}</h2>
            <p class="leading-relaxed text-ink2">
              {{
                t("why.weightBody", {
                  weight: formatNumber(rec.regional.coverage.districtWeight * 100, lang()),
                  records: formatNumber(rec.regional.coverage.districtRecords, lang()),
                  first: rec.regional.coverage.firstYear,
                  last: rec.regional.coverage.lastYear,
                  years: rec.regional.coverage.yearsCovered.length,
                })
              }}
            </p>
            <p v-if="rec.regional.coverage.stateFallbackUsed" class="mt-2 leading-relaxed text-ink2">
              {{ t("why.fallbackBody", { state: rec.regional.state }) }}
            </p>
          </section>
          <section aria-labelledby="why-recency">
            <h2 id="why-recency" class="mb-2 text-2xl">{{ t("why.recencyTitle") }}</h2>
            <p class="leading-relaxed text-ink2">{{ t("why.recencyBody") }}</p>
          </section>
          <AppCard class="bg-sage2">
            <h2 class="mb-2 text-2xl">{{ t("why.notTitle") }}</h2>
            <ul class="list-disc space-y-1.5 pl-5 text-ink2">
              <li>{{ t("why.not1") }}</li>
              <li>{{ t("why.not2") }}</li>
              <li>{{ t("why.not3") }}</li>
            </ul>
          </AppCard>
          <section aria-labelledby="why-limits">
            <h2 id="why-limits" class="mb-2 text-2xl">{{ t("guide.caveats") }}</h2>
            <ul class="list-disc space-y-1.5 pl-5 text-sm text-ink2">
              <li v-for="c in [...rec.regional.caveats, ...rec.limitations.filter((l) => !rec.regional.caveats.includes(l))]" :key="c">{{ c }}</li>
            </ul>
          </section>
        </div>
      </div>
    </template>
  </QueryState>
</template>
