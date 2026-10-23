<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import { useI18n } from "vue-i18n";
import { ChevronDown } from "lucide-vue-next";
import type { NavLeaf } from "./nav-config";
import { isActivePath } from "./nav-config";

const props = defineProps<{ label: string; items: NavLeaf[]; path: string }>();
const { t } = useI18n();
const open = ref(false);
const root = ref<HTMLElement | null>(null);
const active = computed(() => props.items.some((i) => isActivePath(props.path, i.href)));

const onDown = (e: MouseEvent) => {
  if (!root.value?.contains(e.target as Node)) open.value = false;
};
const onKey = (e: KeyboardEvent) => {
  if (e.key === "Escape") open.value = false;
};
watch(open, (isOpen) => {
  if (isOpen) {
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
  } else {
    document.removeEventListener("mousedown", onDown);
    document.removeEventListener("keydown", onKey);
  }
});
onBeforeUnmount(() => {
  document.removeEventListener("mousedown", onDown);
  document.removeEventListener("keydown", onKey);
});
</script>

<template>
  <div ref="root" class="relative">
    <button
      type="button"
      :aria-expanded="open"
      aria-haspopup="true"
      :class="[
        'flex min-h-11 items-center gap-1 border-b-2 px-3 text-sm font-semibold',
        active ? 'border-olive-ink text-olive-ink' : 'border-transparent text-ink2 hover:text-forest',
      ]"
      @click="open = !open"
    >
      {{ t(label) }}
      <ChevronDown aria-hidden="true" class="h-4 w-4" />
    </button>
    <ul v-if="open" class="absolute left-0 top-full z-30 mt-1 min-w-52 rounded-lg border border-line-dark bg-surface p-1">
      <li v-for="i in items" :key="i.href">
        <RouterLink
          :to="i.href"
          :aria-current="isActivePath(path, i.href) ? 'page' : undefined"
          :class="[
            'flex min-h-11 items-center rounded-md px-3 text-sm',
            isActivePath(path, i.href) ? 'bg-sage font-semibold text-olive-ink' : 'text-ink hover:bg-sage2',
          ]"
          @click="open = false"
        >
          {{ t(i.key) }}
        </RouterLink>
      </li>
    </ul>
  </div>
</template>
