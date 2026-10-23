<script setup lang="ts">
import { useI18n } from "vue-i18n";

const { t } = useI18n();
</script>

<template>
  <a href="#main" class="sr-only z-50 rounded-md bg-forest px-4 py-3 text-surface focus:not-sr-only focus:absolute focus:left-3 focus:top-3">
    {{ t("common.skipToContent") }}
  </a>
</template>
