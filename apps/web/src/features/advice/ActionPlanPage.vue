<script setup lang="ts">
import { computed } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { ExternalLink } from "lucide-vue-next";
import { recommendations } from "@/lib/api/endpoints";
import type { ActionPlanItem } from "@/lib/api/types";
import { useRecommendation } from "@/composables/useRecommendation";
import { useQuery } from "@/lib/query";
import QueryState from "@/components/data/QueryState.vue";
import AppBadge from "@/components/ui/AppBadge.vue";
import AppCard from "@/components/ui/AppCard.vue";
import PageHeader from "@/components/ui/PageHeader.vue";
import { buttonClass } from "@/components/ui/button-classes";
import BackLink from "./BackLink.vue";

const KINDS: ActionPlanItem["kind"][] = ["DATA_INSIGHT", "CHECKLIST", "OFFICIAL_RESOURCE"];

const props = defineProps<{ id: string }>();
const { t } = useI18n();
const route = useRoute();
const crop = computed(() => (typeof route.query.crop === "string" && route.query.crop ? route.query.crop : null));
const rec = useRecommendation(() => props.id);
const plan = useQuery(
  () => ["plan", props.id, crop.value],
  () => recommendations.plan(props.id, crop.value!),
  { enabled: () => !!crop.value },
);
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <BackLink :to="`/crop-advice/result/${id}`">{{ t("why.back") }}</BackLink>
    <PageHeader :kicker="t('plan.kicker')" :title="crop ? t('plan.titleFor', { crop }) : t('plan.title')" :lead="t('plan.lead')" />
    <QueryState v-if="crop" :query="plan" :is-empty="(d) => d.items.length === 0">
      <template #empty><AppCard>{{ t("plan.empty") }}</AppCard></template>
      <template #default="{ data }">
        <div class="space-y-8">
          <template v-for="kind in KINDS" :key="kind">
            <section v-if="data.items.some((i) => i.kind === kind)" :aria-labelledby="`plan-${kind}`">
              <h2 :id="`plan-${kind}`" class="mb-3 text-2xl">{{ t(`plan.kind.${kind}`) }}</h2>
              <ul class="space-y-3">
                <li v-for="i in data.items.filter((x) => x.kind === kind)" :key="`${i.title}-${i.source.label}`">
                  <AppCard class="space-y-2">
                    <h3 class="text-lg">{{ i.title }}</h3>
                    <p class="text-[15px] leading-relaxed text-ink2">{{ i.detail }}</p>
                    <p class="flex flex-wrap items-center gap-2 text-sm">
                      <AppBadge tone="blue">{{ t(`plan.sourceType.${i.source.type}`) }}</AppBadge>
                      <a v-if="i.source.url" :href="i.source.url" target="_blank" rel="noopener noreferrer" class="inline-flex min-h-11 items-center gap-1 text-olive-ink underline">
                        {{ i.source.label }}
                        <ExternalLink aria-hidden="true" class="h-3.5 w-3.5" />
                        <span class="sr-only">{{ t("common.opensNewTab") }}</span>
                      </a>
                      <span v-else class="text-ink2">{{ i.source.label }}</span>
                    </p>
                  </AppCard>
                </li>
              </ul>
            </section>
          </template>
          <p role="note" class="rounded-lg bg-ochre-soft px-4 py-3 text-sm text-ochre-ink">{{ data.disclaimer }}</p>
        </div>
      </template>
    </QueryState>
    <QueryState v-else :query="rec">
      <template #default="{ data: r }">
        <div>
          <p class="mb-3 text-ink2">{{ t("plan.chooseCrop") }}</p>
          <ul class="flex flex-wrap gap-3">
            <li v-for="c in r.regional.crops" :key="c.crop">
              <RouterLink :class="buttonClass('secondary')" :to="{ path: `/crop-advice/result/${id}/action-plan`, query: { crop: c.crop } }">{{ c.crop }}</RouterLink>
            </li>
          </ul>
        </div>
      </template>
    </QueryState>
  </div>
</template>
