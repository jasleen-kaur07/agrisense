<script setup lang="ts">
import { useI18n } from "vue-i18n";
import AppBadge from "@/components/ui/AppBadge.vue";
import type { DataStatus } from "@/lib/api/types";

/** Status badge only: it carries a label, never any weather value. */
defineProps<{ status: DataStatus }>();
const { t } = useI18n();
const TONE = { LIVE: "olive", CACHED: "ochre", UNAVAILABLE: "terracotta" } as const;
</script>

<template>
  <AppBadge :tone="TONE[status] ?? 'neutral'" data-testid="weather-status" :data-status="status">
    {{ t(`weather.status.${status}`) }}
  </AppBadge>
</template>
