<script setup lang="ts" generic="T">
import type { Query } from "@/lib/query";
import ErrorPanel from "./ErrorPanel.vue";
import SkeletonBlock from "./SkeletonBlock.vue";

/** Renders loading / error (retry + traceId) / empty / success for a query. */
const props = defineProps<{ query: Query<T>; isEmpty?: (data: T) => boolean }>();
defineSlots<{
  default(p: { data: T }): unknown;
  skeleton(): unknown;
  empty(): unknown;
}>();
</script>

<template>
  <slot v-if="props.query.isPending" name="skeleton"><SkeletonBlock /></slot>
  <ErrorPanel v-else-if="props.query.isError" :error="props.query.error" retryable @retry="props.query.refetch()" />
  <slot v-else-if="$slots.empty && isEmpty?.(props.query.data as T)" name="empty" />
  <slot v-else :data="props.query.data as T" />
</template>
