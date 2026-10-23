<script setup lang="ts">
type Tone = "neutral" | "olive" | "blue" | "ochre" | "terracotta";
const tones: Record<Tone, string> = {
  neutral: "bg-surface2 text-ink2",
  olive: "bg-sage text-olive-ink",
  blue: "bg-blue-soft text-blue-ink",
  ochre: "bg-ochre-soft text-ochre-ink",
  terracotta: "bg-terracotta-soft text-terracotta-ink",
};
withDefaults(defineProps<{ tone?: Tone }>(), { tone: "neutral" });
</script>

<template>
  <span :class="['inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold tracking-wide', tones[tone]]"><slot /></span>
</template>
