<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { admin } from "@/lib/api/endpoints";
import type { Lang } from "@/i18n/core";
import { formatDateTime } from "@/lib/format";
import { invalidateQueries, useMutation, useQuery } from "@/lib/query";
import EmptyState from "@/components/data/EmptyState.vue";
import ErrorPanel from "@/components/data/ErrorPanel.vue";
import QueryState from "@/components/data/QueryState.vue";
import AppButton from "@/components/ui/AppButton.vue";
import TextInput from "@/components/ui/TextInput.vue";

const { t, locale } = useI18n();
const page = ref(0);
const qText = ref("");
const term = ref("");
const q = useQuery(() => ["admin", "users", page.value, term.value], () => admin.users(page.value, 20, term.value || undefined));
const toggle = useMutation((v: { id: string; enabled: boolean }) => admin.patchUser(v.id, { enabled: v.enabled }), {
  onSuccess: () => invalidateQueries(["admin", "users"]),
});
function search() {
  page.value = 0;
  term.value = qText.value.trim();
}
</script>

<template>
  <div class="space-y-4">
    <form class="flex items-end gap-3" @submit.prevent="search">
      <div class="max-w-xs flex-1"><TextInput v-model="qText" :label="t('admin.searchUsers')" /></div>
      <AppButton type="submit" variant="secondary">{{ t("common.search") }}</AppButton>
    </form>
    <ErrorPanel v-if="toggle.isError" :error="toggle.error" />
    <QueryState :query="q" :is-empty="(d) => d.items.length === 0">
      <template #empty><EmptyState :title="t('admin.noUsers')" /></template>
      <template #default="{ data: d }">
        <div class="overflow-x-auto rounded-[10px] border border-line bg-surface">
          <table class="w-full min-w-[560px] text-left text-sm">
            <caption class="sr-only">{{ t("admin.users") }}</caption>
            <thead>
              <tr class="border-b border-line text-muted">
                <th scope="col" class="p-3">{{ t("auth.email") }}</th>
                <th scope="col" class="p-3">{{ t("admin.roles") }}</th>
                <th scope="col" class="p-3">{{ t("admin.created") }}</th>
                <th scope="col" class="p-3">{{ t("admin.status") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="u in d.items" :key="u.id" class="border-b border-line last:border-0">
                <th scope="row" class="p-3 font-medium">{{ u.email }}</th>
                <td class="p-3">{{ u.roles.join(", ") }}</td>
                <td class="p-3">{{ formatDateTime(u.createdAt, locale as Lang) }}</td>
                <td class="p-3">
                  <AppButton
                    :variant="u.enabled ? 'secondary' : 'primary'"
                    class="min-h-11"
                    :disabled="toggle.isPending"
                    :aria-label="t(u.enabled ? 'admin.disableAria' : 'admin.enableAria', { email: u.email })"
                    @click="toggle.mutate({ id: u.id, enabled: !u.enabled })"
                  >
                    {{ u.enabled ? t("admin.disable") : t("admin.enable") }}
                  </AppButton>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="mt-4 flex items-center justify-between">
          <AppButton variant="secondary" :disabled="page === 0" @click="page--">{{ t("common.previous") }}</AppButton>
          <span class="text-sm text-ink2">{{ t("history.pageOf", { page: page + 1, total: Math.max(1, d.totalPages) }) }}</span>
          <AppButton variant="secondary" :disabled="page + 1 >= d.totalPages" @click="page++">{{ t("common.next") }}</AppButton>
        </div>
      </template>
    </QueryState>
  </div>
</template>
