<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { alerts } from "@/lib/api/endpoints";
import type { Lang } from "@/i18n/core";
import { formatDateTime } from "@/lib/format";
import { invalidateQueries, useMutation, useQuery } from "@/lib/query";
import EmptyState from "@/components/data/EmptyState.vue";
import ErrorPanel from "@/components/data/ErrorPanel.vue";
import QueryState from "@/components/data/QueryState.vue";
import AppBadge from "@/components/ui/AppBadge.vue";
import AppButton from "@/components/ui/AppButton.vue";
import AppCard from "@/components/ui/AppCard.vue";
import PageHeader from "@/components/ui/PageHeader.vue";

const { t, locale } = useI18n();
const unreadOnly = ref(false);
const q = useQuery(() => ["alerts", unreadOnly.value], () => alerts.list(unreadOnly.value));
const mark = useMutation((id: string) => alerts.markRead(id), { onSuccess: () => invalidateQueries(["alerts"]) });
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <PageHeader :kicker="t('nav.more')" :title="t('alerts.title')" :lead="t('alerts.lead')">
      <template #actions>
        <label class="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
          <input v-model="unreadOnly" type="checkbox" class="h-4 w-4 accent-[#19342d]" />
          {{ t("alerts.unreadOnly") }}
        </label>
      </template>
    </PageHeader>
    <div v-if="mark.isError" class="mb-4"><ErrorPanel :error="mark.error" /></div>
    <QueryState :query="q" :is-empty="(d) => d.length === 0">
      <template #empty><EmptyState :title="t('alerts.emptyTitle')" :body="t('alerts.emptyBody')" /></template>
      <template #default="{ data: list }">
        <ul class="space-y-3">
          <li v-for="a in list" :key="a.id">
            <AppCard :class="a.read ? 'opacity-80' : 'border-line-dark'">
              <div class="flex flex-wrap items-center gap-2">
                <AppBadge :tone="a.severity === 'WATCH' ? 'ochre' : 'blue'">{{ t(`alerts.severity.${a.severity}`) }}</AppBadge>
                <AppBadge v-if="!a.read" tone="olive">{{ t("alerts.new") }}</AppBadge>
                <span class="text-xs text-muted">{{ formatDateTime(a.createdAt, locale as Lang) }}</span>
              </div>
              <h2 class="mt-2 text-xl">{{ a.title }}</h2>
              <p class="mt-1 text-[15px] leading-relaxed text-ink2">{{ a.message }}</p>
              <p v-if="a.source" class="mt-1 text-xs text-muted">{{ t("alerts.source") }}: {{ a.source }}</p>
              <AppButton v-if="!a.read" variant="secondary" class="mt-3" :disabled="mark.isPending" @click="mark.mutate(a.id)">{{ t("alerts.markRead") }}</AppButton>
            </AppCard>
          </li>
        </ul>
      </template>
    </QueryState>
  </div>
</template>
