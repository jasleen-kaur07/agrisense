<script setup lang="ts">
import KickerText from "./KickerText.vue";

defineProps<{ kicker?: string; title: string; lead?: string }>();
</script>

<template>
  <header class="mb-8 flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
    <div class="max-w-2xl">
      <KickerText v-if="kicker" class="mb-2">{{ kicker }}</KickerText>
      <h1 class="text-3xl leading-tight sm:text-4xl">{{ title }}</h1>
      <div v-if="lead || $slots.lead" class="mt-3 text-[15px] leading-relaxed text-ink2">
        <slot name="lead">{{ lead }}</slot>
      </div>
    </div>
    <div v-if="$slots.actions" class="flex flex-wrap gap-3"><slot name="actions" /></div>
  </header>
</template>
