<script setup lang="ts" generic="T extends string">
import { cn } from "@/lib/cn";

defineProps<{ legend: string; modelValue: T | null; options: { value: T; label: string; hint?: string }[] }>();
const emit = defineEmits<{ "update:modelValue": [value: T] }>();
</script>

<template>
  <fieldset class="space-y-3">
    <legend class="mb-2 text-sm font-semibold text-ink2">{{ legend }}</legend>
    <label
      v-for="o in options"
      :key="o.value"
      :class="cn(
        'flex min-h-14 cursor-pointer items-start gap-3 rounded-lg border bg-surface p-4 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-olive-ink',
        modelValue === o.value ? 'border-forest ring-1 ring-forest' : 'border-line-dark',
      )"
    >
      <input type="radio" :name="legend" class="mt-1 h-4 w-4 accent-[#19342d]" :checked="modelValue === o.value" @change="emit('update:modelValue', o.value)" />
      <span>
        <span class="block font-semibold text-ink">{{ o.label }}</span>
        <span v-if="o.hint" class="block text-sm text-ink2">{{ o.hint }}</span>
      </span>
    </label>
  </fieldset>
</template>
