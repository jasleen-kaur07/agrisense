<script setup lang="ts">
import { useI18n } from "vue-i18n";
import LinkButton from "@/components/ui/LinkButton.vue";
import PageHeader from "@/components/ui/PageHeader.vue";

const { t } = useI18n();
const sections = ["what", "data", "weather", "soil", "limits"] as const;
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <PageHeader :kicker="t('how.kicker')" :title="t('how.title')" :lead="t('how.lead')" />
    <div class="space-y-8">
      <section v-for="s in sections" :key="s" :aria-labelledby="`how-${s}`" class="border-b border-line pb-6">
        <h2 :id="`how-${s}`" class="mb-2 text-2xl">{{ t(`how.${s}Title`) }}</h2>
        <p class="leading-relaxed text-ink2">{{ t(`how.${s}Body`) }}</p>
      </section>
    </div>
    <div class="mt-8">
      <LinkButton to="/register">{{ t("landing.cta") }}</LinkButton>
    </div>
  </div>
</template>
