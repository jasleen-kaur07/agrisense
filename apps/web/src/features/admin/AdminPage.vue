<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { cn } from "@/lib/cn";
import { useSessionStore } from "@/stores/session";
import AppCard from "@/components/ui/AppCard.vue";
import PageHeader from "@/components/ui/PageHeader.vue";
import AdminFeedback from "./AdminFeedback.vue";
import AdminOverview from "./AdminOverview.vue";
import AdminRecs from "./AdminRecs.vue";
import AdminUsers from "./AdminUsers.vue";

type Tab = "overview" | "users" | "recs" | "feedback";
const tabs: Tab[] = ["overview", "users", "recs", "feedback"];

const { t } = useI18n();
const session = useSessionStore();
const tab = ref<Tab>("overview");
</script>

<template>
  <AppCard v-if="session.user && !session.isAdmin" role="alert">
    <h1 class="mb-2 text-2xl">{{ t("admin.forbiddenTitle") }}</h1>
    <p class="text-ink2">{{ t("admin.forbiddenBody") }}</p>
  </AppCard>
  <div v-else>
    <PageHeader :kicker="t('nav.admin')" :title="t('admin.title')" :lead="t('admin.lead')" />
    <div role="tablist" :aria-label="t('admin.title')" class="mb-6 flex flex-wrap gap-2 border-b border-line">
      <button
        v-for="k in tabs"
        :id="`tab-${k}`"
        :key="k"
        role="tab"
        :aria-selected="tab === k"
        :aria-controls="`panel-${k}`"
        type="button"
        :class="cn('min-h-11 border-b-2 px-4 text-sm font-semibold', tab === k ? 'border-olive-ink text-olive-ink' : 'border-transparent text-ink2')"
        @click="tab = k"
      >
        {{ t(`admin.tab.${k}`) }}
      </button>
    </div>
    <div :id="`panel-${tab}`" role="tabpanel" :aria-labelledby="`tab-${tab}`">
      <AdminOverview v-if="tab === 'overview'" />
      <AdminUsers v-else-if="tab === 'users'" />
      <AdminRecs v-else-if="tab === 'recs'" />
      <AdminFeedback v-else />
    </div>
  </div>
</template>
