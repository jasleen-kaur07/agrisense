<script setup lang="ts">
import { RouterLink, type RouteLocationRaw } from "vue-router";
import { ArrowLeft } from "lucide-vue-next";

defineProps<{ to: RouteLocationRaw }>();
</script>

<template>
  <RouterLink :to="to" class="mb-4 inline-flex min-h-11 items-center gap-1 text-sm text-olive-ink underline">
    <ArrowLeft aria-hidden="true" class="h-4 w-4" /><slot />
  </RouterLink>
</template>
