<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { Lang } from "@/i18n/core";
import { formatMonth } from "@/lib/format";
import { useSeason } from "@/composables/queries";
import QueryState from "@/components/data/QueryState.vue";
import AppCard from "@/components/ui/AppCard.vue";
import PageHeader from "@/components/ui/PageHeader.vue";

const { t, locale } = useI18n();
const q = useSeason();
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <PageHeader :kicker="t('nav.more')" :title="t('seasonPage.title')" :lead="t('seasonPage.lead')" />
    <QueryState :query="q">
      <template #default="{ data: s }">
        <div class="space-y-6">
          <div class="grid gap-4 sm:grid-cols-2">
            <AppCard class="bg-ochre-soft">
              <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-ochre-ink">{{ t("seasonPage.current") }}</p>
              <p class="mt-2 font-serif text-3xl text-forest">{{ t(`season.${s.season}`) }}</p>
              <p class="mt-2 text-sm text-ink2">{{ s.months.map((m) => formatMonth(m, locale as Lang)).join(", ") }}</p>
            </AppCard>
            <AppCard>
              <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-olive-ink">{{ t("seasonPage.next") }}</p>
              <p class="mt-2 font-serif text-3xl text-forest">{{ t(`season.${s.next}`) }}</p>
            </AppCard>
          </div>
          <AppCard class="bg-sage2">
            <h2 class="mb-2 text-xl">{{ t("seasonPage.ruleTitle") }}</h2>
            <p class="leading-relaxed text-ink2">{{ s.rule }}</p>
            <p class="mt-3 text-sm text-ink2">{{ t("seasonPage.ruleNote") }}</p>
          </AppCard>
        </div>
      </template>
    </QueryState>
  </div>
</template>
