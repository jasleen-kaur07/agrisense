<script setup lang="ts">
import { Check, Loader2 } from "lucide-vue-next";

defineProps<{ items: { label: string; status: "pending" | "done" | "error" }[] }>();
</script>

<template>
  <ul class="space-y-3">
    <li v-for="i in items" :key="i.label" class="flex items-center gap-3 text-[15px]">
      <Loader2 v-if="i.status === 'pending'" aria-hidden="true" class="spin h-5 w-5 text-olive-ink" />
      <Check v-else-if="i.status === 'done'" aria-hidden="true" class="h-5 w-5 text-olive-ink" />
      <span v-else aria-hidden="true" class="h-5 w-5 text-terracotta-ink">!</span>
      <span>{{ i.label }}</span>
    </li>
  </ul>
</template>
