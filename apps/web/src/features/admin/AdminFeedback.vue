<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { admin } from "@/lib/api/endpoints";
import type { Lang } from "@/i18n/core";
import { formatDateTime } from "@/lib/format";
import { useQuery } from "@/lib/query";
import EmptyState from "@/components/data/EmptyState.vue";
import QueryState from "@/components/data/QueryState.vue";
import AppCard from "@/components/ui/AppCard.vue";

const { t, locale } = useI18n();
const q = useQuery(() => ["admin", "feedback"], admin.feedback);
</script>

<template>
  <QueryState :query="q" :is-empty="(d) => d.length === 0">
    <template #empty><EmptyState :title="t('admin.noFeedback')" /></template>
    <template #default="{ data: items }">
      <ul class="space-y-3">
        <li v-for="(f, i) in items" :key="f.id ?? i">
          <AppCard>
            <p class="text-xs text-muted">
              {{ [f.category, f.rating ? `${f.rating}/5` : null, f.createdAt ? formatDateTime(f.createdAt, locale as Lang) : null].filter(Boolean).join(" · ") }}
            </p>
            <p class="mt-1 whitespace-pre-wrap text-[15px]">{{ f.message }}</p>
          </AppCard>
        </li>
      </ul>
    </template>
  </QueryState>
</template>
