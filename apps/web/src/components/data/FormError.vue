<script setup lang="ts">
import { useI18n } from "vue-i18n";

defineProps<{ message: string | null; traceId?: string }>();
const { t } = useI18n();
</script>

<template>
  <p v-if="message" role="alert" class="rounded-lg bg-terracotta-soft px-3 py-2 text-sm font-medium text-terracotta-ink">
    {{ message }}
    <span v-if="traceId" class="mt-1 block text-xs font-normal">{{ t("errors.traceId") }}: {{ traceId }}</span>
  </p>
</template>
