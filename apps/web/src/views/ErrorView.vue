<script setup lang="ts">
import { useI18n } from "vue-i18n";
import AppButton from "@/components/ui/AppButton.vue";

/** Shown by the app-level error boundary. `retry` clears the error and re-renders the page. */
defineProps<{ message?: string }>();
const emit = defineEmits<{ retry: [] }>();
const { t } = useI18n();
</script>

<template>
  <main id="main" role="alert" class="mx-auto max-w-lg px-4 py-24 text-center">
    <h1 class="mb-3 text-4xl">{{ t("errors.title") }}</h1>
    <p class="mb-6 text-ink2">{{ t("errors.crashBody") }}</p>
    <AppButton @click="emit('retry')">{{ t("common.retry") }}</AppButton>
  </main>
</template>
