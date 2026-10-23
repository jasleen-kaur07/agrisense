<script setup lang="ts">
defineProps<{ label: string; hint?: string; error?: string; htmlFor: string }>();
</script>

<template>
  <div class="space-y-1.5">
    <label :for="htmlFor" class="block text-sm font-semibold text-ink2">{{ label }}</label>
    <slot />
    <p v-if="hint && !error" :id="`${htmlFor}-hint`" class="text-sm text-muted">{{ hint }}</p>
    <p v-if="error" :id="`${htmlFor}-err`" role="alert" class="text-sm font-medium text-terracotta-ink">{{ error }}</p>
  </div>
</template>
