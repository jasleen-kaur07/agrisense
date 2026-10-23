<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { ApiError } from "@/lib/api/errors";

const props = defineProps<{ error: unknown }>();
const { t } = useI18n();
const api = computed(() => (props.error instanceof ApiError ? props.error : null));
</script>

<template>
  <p v-if="error" role="alert" class="rounded-lg bg-terracotta-soft px-3 py-2 text-sm font-medium text-terracotta-ink">
    {{ api?.isNetworkError ? t("errors.offlineBody") : api?.detail || api?.title || t("errors.generic") }}
    <span v-if="api?.traceId" class="mt-1 block text-xs font-normal">{{ t("errors.traceId") }}: {{ api.traceId }}</span>
  </p>
</template>
