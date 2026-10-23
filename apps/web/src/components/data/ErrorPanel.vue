<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { AlertTriangle, WifiOff } from "lucide-vue-next";
import { ApiError } from "@/lib/api/errors";
import AppButton from "@/components/ui/AppButton.vue";
import AppCard from "@/components/ui/AppCard.vue";

const props = defineProps<{ error: unknown; retryable?: boolean }>();
const emit = defineEmits<{ retry: [] }>();
const { t } = useI18n();
const api = computed(() => (props.error instanceof ApiError ? props.error : null));
const offline = computed(() => api.value?.isNetworkError ?? false);
</script>

<template>
  <AppCard role="alert" class="border-terracotta/40 bg-terracotta-soft/40">
    <div class="flex items-start gap-3">
      <WifiOff v-if="offline" aria-hidden="true" class="mt-0.5 h-5 w-5 shrink-0 text-terracotta-ink" />
      <AlertTriangle v-else aria-hidden="true" class="mt-0.5 h-5 w-5 shrink-0 text-terracotta-ink" />
      <div class="space-y-2">
        <p class="font-semibold text-ink">{{ offline ? t("errors.offlineTitle") : t("errors.title") }}</p>
        <p class="text-sm text-ink2">{{ offline ? t("errors.offlineBody") : api?.detail || api?.title || t("errors.generic") }}</p>
        <p v-if="api?.traceId" class="text-xs text-muted">
          {{ t("errors.traceId") }}: <code>{{ api.traceId }}</code>
        </p>
        <AppButton v-if="retryable" variant="secondary" @click="emit('retry')">{{ t("common.retry") }}</AppButton>
      </div>
    </div>
  </AppCard>
</template>
