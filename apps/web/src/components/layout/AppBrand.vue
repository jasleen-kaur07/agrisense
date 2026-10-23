<script setup lang="ts">
import { RouterLink } from "vue-router";
import BrandMark from "./BrandMark.vue";

withDefaults(defineProps<{ to?: string }>(), { to: "/" });
</script>

<template>
  <RouterLink :to="to" class="flex min-h-11 items-center gap-2.5 font-sans text-lg font-extrabold tracking-tight text-forest">
    <BrandMark />
    AgriSense
  </RouterLink>
</template>
