<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { useI18n } from "vue-i18n";
import { formatDateTime } from "@/lib/format";
import type { Lang } from "@/i18n/core";
import type { Recommendation } from "@/lib/api/types";
import { useRecommendation } from "@/composables/useRecommendation";
import QueryState from "@/components/data/QueryState.vue";
import LinkButton from "@/components/ui/LinkButton.vue";
import PageHeader from "@/components/ui/PageHeader.vue";
import { buttonClass } from "@/components/ui/button-classes";
import RegionalGuide from "@/components/advice/RegionalGuide.vue";
import WeatherPanel from "@/components/weather/WeatherPanel.vue";
import BackLink from "./BackLink.vue";

const props = defineProps<{ id: string }>();
const { t, locale } = useI18n();
const q = useRecommendation(() => props.id);

function summary(rec: Recommendation): string {
  const place = [rec.location.district ?? rec.regional.district, rec.location.state ?? rec.regional.state].filter(Boolean).join(", ");
  return [rec.fieldName, place, t(`season.${rec.season}`), formatDateTime(rec.createdAt, locale.value as Lang)].filter(Boolean).join(" · ");
}
const planLink = (crop: string) => ({ path: `/crop-advice/result/${props.id}/action-plan`, query: { crop } });
const base = computed(() => `/crop-advice/result/${props.id}`);
</script>

<template>
  <QueryState :query="q">
    <template #default="{ data: rec }">
      <div>
        <BackLink to="/crop-advice">{{ t("result.newGuide") }}</BackLink>
        <PageHeader :kicker="t('result.kicker')" :title="t('result.title')" :lead="summary(rec)">
          <template #actions>
            <LinkButton :to="`${base}/why`" variant="secondary">{{ t("result.why") }}</LinkButton>
            <LinkButton :to="`${base}/compare`" variant="secondary">{{ t("result.compare") }}</LinkButton>
            <LinkButton to="/more/history" variant="ghost">{{ t("result.history") }}</LinkButton>
          </template>
        </PageHeader>
        <p class="mb-6 text-sm text-ink2">{{ t("result.savedAuto") }}</p>
        <div class="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
          <RegionalGuide :guide="rec.regional" :limitations="rec.limitations">
            <template #crop-action="{ crop }">
              <RouterLink
                :to="planLink(crop.crop)"
                :class="buttonClass('secondary', 'min-h-11 px-3 text-sm')"
                :aria-label="t('result.actionPlanFor', { crop: crop.crop })"
              >
                {{ t("result.actionPlan") }}
              </RouterLink>
            </template>
          </RegionalGuide>
          <div class="space-y-4">
            <WeatherPanel :weather="rec.weather" variant="strip" snapshot :place="rec.location.district" />
            <p class="text-sm text-ink2">{{ t("result.soilNote") }}</p>
          </div>
        </div>
      </div>
    </template>
  </QueryState>
</template>
