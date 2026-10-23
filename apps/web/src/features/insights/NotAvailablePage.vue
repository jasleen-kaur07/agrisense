<script setup lang="ts">
import { useI18n } from "vue-i18n";
import AppBadge from "@/components/ui/AppBadge.vue";
import AppCard from "@/components/ui/AppCard.vue";
import LinkButton from "@/components/ui/LinkButton.vue";
import PageHeader from "@/components/ui/PageHeader.vue";

/** Honest "not available yet" page; deliberately shows no numbers or placeholder values. */
defineProps<{ topic: "prediction" | "fertilizer" | "market" }>();
const { t } = useI18n();
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <PageHeader :kicker="t('nav.insights')" :title="t(`nav.${topic}`)">
      <template #actions><AppBadge tone="ochre">{{ t("notAvailable.badge") }}</AppBadge></template>
    </PageHeader>
    <AppCard class="space-y-4">
      <h2 class="text-2xl">{{ t("notAvailable.title") }}</h2>
      <p class="leading-relaxed text-ink2">{{ t(`notAvailable.${topic}Why`) }}</p>
      <p class="leading-relaxed text-ink2">{{ t(`notAvailable.${topic}Meanwhile`) }}</p>
      <div class="flex flex-wrap gap-3 pt-2">
        <LinkButton to="/crop-advice">{{ t("notAvailable.toGuide") }}</LinkButton>
        <LinkButton to="/more/schemes" variant="secondary">{{ t("nav.schemes") }}</LinkButton>
      </div>
    </AppCard>
  </div>
</template>
