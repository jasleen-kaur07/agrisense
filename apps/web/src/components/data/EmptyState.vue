<script setup lang="ts">
import { Inbox } from "lucide-vue-next";
import AppCard from "@/components/ui/AppCard.vue";

defineProps<{ title: string; body?: string }>();
</script>

<template>
  <AppCard class="flex flex-col items-center gap-3 py-10 text-center">
    <Inbox aria-hidden="true" class="h-7 w-7 text-olive" />
    <p class="font-serif text-xl text-forest">{{ title }}</p>
    <p v-if="body" class="max-w-md text-sm text-ink2">{{ body }}</p>
    <slot />
  </AppCard>
</template>
