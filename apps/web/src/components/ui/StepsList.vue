<script setup lang="ts">
import { Check } from "lucide-vue-next";

/** Ordered progress list. `labels` are already translated. */
defineProps<{ labels: string[]; current: number; label: string }>();

type StepState = "done" | "current" | "todo";
const stateOf = (i: number, current: number): StepState => (i < current ? "done" : i === current ? "current" : "todo");
</script>

<template>
  <ol :aria-label="label" class="flex flex-wrap gap-x-6 gap-y-2">
    <li
      v-for="(l, i) in labels"
      :key="l"
      :aria-current="stateOf(i, current) === 'current' ? 'step' : undefined"
      class="flex items-center gap-2 text-sm"
    >
      <span
        :class="[
          'flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold',
          stateOf(i, current) === 'done' && 'border-olive-ink bg-olive-ink text-surface',
          stateOf(i, current) === 'current' && 'border-forest bg-forest text-surface',
          stateOf(i, current) === 'todo' && 'border-line-dark text-muted',
        ]"
      >
        <Check v-if="stateOf(i, current) === 'done'" aria-hidden="true" class="h-4 w-4" />
        <template v-else>{{ i + 1 }}</template>
      </span>
      <span :class="stateOf(i, current) === 'todo' ? 'text-muted' : 'font-semibold text-ink'">{{ l }}</span>
    </li>
  </ol>
</template>
