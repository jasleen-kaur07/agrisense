<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { ExternalLink } from "lucide-vue-next";
import AppCard from "@/components/ui/AppCard.vue";
import PageHeader from "@/components/ui/PageHeader.vue";

/** Official portals only. No eligibility, amounts or scheme content is reproduced. */
const PORTALS = [
  { id: "soil", host: "soilhealth.dac.gov.in", url: "https://soilhealth.dac.gov.in/" },
  { id: "pmfby", host: "pmfby.gov.in", url: "https://pmfby.gov.in/" },
  { id: "pmkisan", host: "pmkisan.gov.in", url: "https://pmkisan.gov.in/" },
  { id: "farmer", host: "farmer.gov.in", url: "https://farmer.gov.in/" },
] as const;

const { t } = useI18n();
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <PageHeader :kicker="t('nav.more')" :title="t('schemes.title')" :lead="t('schemes.lead')" />
    <ul class="space-y-3">
      <li v-for="p in PORTALS" :key="p.id">
        <AppCard>
          <h2 class="text-xl">{{ t(`schemes.${p.id}.name`) }}</h2>
          <p class="mt-1 text-[15px] text-ink2">{{ t(`schemes.${p.id}.about`) }}</p>
          <a :href="p.url" target="_blank" rel="noopener noreferrer" class="mt-3 inline-flex min-h-11 items-center gap-1.5 font-semibold text-olive-ink underline">
            {{ p.host }}
            <ExternalLink aria-hidden="true" class="h-4 w-4" />
            <span class="sr-only">{{ t("common.opensNewTab") }}</span>
          </a>
        </AppCard>
      </li>
    </ul>
    <p role="note" class="mt-6 rounded-lg bg-ochre-soft px-4 py-3 text-sm text-ochre-ink">{{ t("schemes.note") }}</p>
  </div>
</template>
