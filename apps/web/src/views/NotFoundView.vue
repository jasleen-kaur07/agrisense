<script setup lang="ts">
import { useI18n } from "vue-i18n";
import LinkButton from "@/components/ui/LinkButton.vue";

const { t } = useI18n();
</script>

<template>
  <main id="main" class="mx-auto max-w-lg px-4 py-24 text-center">
    <h1 class="mb-3 text-4xl">{{ t("errors.notFoundTitle") }}</h1>
    <p class="mb-6 text-ink2">{{ t("errors.notFoundBody") }}</p>
    <LinkButton to="/">{{ t("errors.notFoundCta") }}</LinkButton>
  </main>
</template>
