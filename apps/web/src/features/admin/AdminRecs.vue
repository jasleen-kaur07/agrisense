<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { admin } from "@/lib/api/endpoints";
import type { Lang } from "@/i18n/core";
import { formatDateTime } from "@/lib/format";
import { useQuery } from "@/lib/query";
import EmptyState from "@/components/data/EmptyState.vue";
import QueryState from "@/components/data/QueryState.vue";
import AppButton from "@/components/ui/AppButton.vue";

const { t, locale } = useI18n();
const page = ref(0);
const q = useQuery(() => ["admin", "recs", page.value], () => admin.recommendations(page.value, 20));
</script>

<template>
  <QueryState :query="q" :is-empty="(d) => d.items.length === 0">
    <template #empty><EmptyState :title="t('admin.noRecs')" /></template>
    <template #default="{ data: d }">
      <div class="space-y-4">
        <div class="overflow-x-auto rounded-[10px] border border-line bg-surface">
          <table class="w-full min-w-[560px] text-left text-sm">
            <caption class="sr-only">{{ t("admin.recs") }}</caption>
            <thead>
              <tr class="border-b border-line text-muted">
                <th scope="col" class="p-3">{{ t("admin.created") }}</th>
                <th scope="col" class="p-3">{{ t("admin.field") }}</th>
                <th scope="col" class="p-3">{{ t("location.district") }}</th>
                <th scope="col" class="p-3">{{ t("advice.seasonLabel") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in d.items" :key="r.id" class="border-b border-line last:border-0">
                <td class="p-3">{{ formatDateTime(r.createdAt, locale as Lang) }}</td>
                <td class="p-3">{{ r.fieldName ?? "–" }}</td>
                <td class="p-3">{{ r.location.district ?? r.regional.district }}</td>
                <td class="p-3">{{ t(`season.${r.season}`) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="flex items-center justify-between">
          <AppButton variant="secondary" :disabled="page === 0" @click="page--">{{ t("common.previous") }}</AppButton>
          <span class="text-sm text-ink2">{{ t("history.pageOf", { page: page + 1, total: Math.max(1, d.totalPages) }) }}</span>
          <AppButton variant="secondary" :disabled="page + 1 >= d.totalPages" @click="page++">{{ t("common.next") }}</AppButton>
        </div>
      </div>
    </template>
  </QueryState>
</template>
