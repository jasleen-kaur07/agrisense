<script setup lang="ts">
import { ref } from "vue";
import { RouterLink } from "vue-router";
import { useI18n } from "vue-i18n";
import { recommendations } from "@/lib/api/endpoints";
import type { Lang } from "@/i18n/core";
import { formatDateTime } from "@/lib/format";
import { invalidateQueries, useMutation, useQuery } from "@/lib/query";
import EmptyState from "@/components/data/EmptyState.vue";
import QueryState from "@/components/data/QueryState.vue";
import AppButton from "@/components/ui/AppButton.vue";
import AppCard from "@/components/ui/AppCard.vue";
import LinkButton from "@/components/ui/LinkButton.vue";
import PageHeader from "@/components/ui/PageHeader.vue";

const { t, locale } = useI18n();
const page = ref(0);
const q = useQuery(() => ["recommendations", page.value], () => recommendations.list(page.value, 10));
const del = useMutation((id: string) => recommendations.remove(id), { onSuccess: () => invalidateQueries(["recommendations"]) });
const confirmDelete = (id: string) => {
  if (window.confirm(t("history.confirmDelete"))) del.mutate(id);
};
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <PageHeader :kicker="t('nav.more')" :title="t('history.title')" :lead="t('history.lead')" />
    <QueryState :query="q" :is-empty="(d) => d.items.length === 0">
      <template #empty>
        <EmptyState :title="t('history.emptyTitle')" :body="t('history.emptyBody')">
          <LinkButton to="/crop-advice">{{ t("overview.cta") }}</LinkButton>
        </EmptyState>
      </template>
      <template #default="{ data }">
        <div class="space-y-4">
          <ul class="space-y-3">
            <li v-for="r in data.items" :key="r.id">
              <AppCard class="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <RouterLink :to="`/crop-advice/result/${r.id}`" class="inline-flex min-h-11 items-center font-serif text-xl text-forest underline-offset-2 hover:underline">
                    {{ [r.fieldName, r.location.district ?? r.regional.district].filter(Boolean).join(" · ") }}
                  </RouterLink>
                  <p class="text-sm text-ink2">{{ t(`season.${r.season}`) }} · {{ formatDateTime(r.createdAt, locale as Lang) }}</p>
                  <p v-if="r.regional.crops[0]" class="text-sm text-ink2">{{ t("history.topHistorical", { crop: r.regional.crops[0].crop }) }}</p>
                </div>
                <div class="flex gap-2">
                  <LinkButton :to="`/crop-advice/result/${r.id}`" variant="secondary">{{ t("history.open") }}</LinkButton>
                  <AppButton variant="ghost" :disabled="del.isPending" :aria-label="t('history.deleteAria', { name: r.fieldName ?? '' })" @click="confirmDelete(r.id)">
                    {{ t("common.delete") }}
                  </AppButton>
                </div>
              </AppCard>
            </li>
          </ul>
          <nav v-if="data.totalPages > 1" :aria-label="t('history.pagination')" class="flex items-center justify-between">
            <AppButton variant="secondary" :disabled="page === 0" @click="page--">{{ t("common.previous") }}</AppButton>
            <span class="text-sm text-ink2">{{ t("history.pageOf", { page: page + 1, total: data.totalPages }) }}</span>
            <AppButton variant="secondary" :disabled="page + 1 >= data.totalPages" @click="page++">{{ t("common.next") }}</AppButton>
          </nav>
        </div>
      </template>
    </QueryState>
  </div>
</template>
