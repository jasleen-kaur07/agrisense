<script setup lang="ts">
import { useI18n } from "vue-i18n";
import AppSkeleton from "@/components/ui/AppSkeleton.vue";

withDefaults(defineProps<{ rows?: number }>(), { rows: 3 });
const { t } = useI18n();
</script>

<template>
  <div role="status" aria-live="polite" class="space-y-3" data-testid="loading">
    <span class="sr-only">{{ t("common.loading") }}</span>
    <AppSkeleton class="h-7 w-1/3" />
    <AppSkeleton v-for="i in rows" :key="i" class="h-14" />
  </div>
</template>
