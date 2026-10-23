<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { admin } from "@/lib/api/endpoints";
import type { Lang } from "@/i18n/core";
import { formatNumber } from "@/lib/format";
import { useQuery } from "@/lib/query";
import QueryState from "@/components/data/QueryState.vue";
import AppCard from "@/components/ui/AppCard.vue";

const { t, locale } = useI18n();
const stats = useQuery(() => ["admin", "stats"], admin.stats);
const summary = useQuery(() => ["admin", "summary"], admin.dataSummary);
const n = (v: number | undefined) => (v === undefined ? "–" : formatNumber(v, locale.value as Lang));
const KEYS = ["users", "farms", "fields", "recommendations", "feedback"] as const;
</script>

<template>
  <div class="space-y-8">
    <section aria-labelledby="ad-stats">
      <h2 id="ad-stats" class="mb-3 text-2xl">{{ t("admin.stats") }}</h2>
      <QueryState :query="stats">
        <template #default="{ data: s }">
          <dl class="grid gap-4 sm:grid-cols-5">
            <AppCard v-for="k in KEYS" :key="k">
              <dt class="text-sm text-muted">{{ t(`admin.stat.${k}`) }}</dt>
              <dd class="font-serif text-3xl text-forest">{{ n(s[k]) }}</dd>
            </AppCard>
          </dl>
        </template>
      </QueryState>
    </section>
    <section aria-labelledby="ad-data">
      <h2 id="ad-data" class="mb-3 text-2xl">{{ t("admin.dataSummary") }}</h2>
      <QueryState :query="summary">
        <template #default="{ data: d }">
          <AppCard>
            <dl class="grid gap-4 text-sm sm:grid-cols-3">
              <div><dt class="text-muted">{{ t("admin.districts") }}</dt><dd class="font-serif text-2xl">{{ n(d.districts) }}</dd></div>
              <div><dt class="text-muted">{{ t("admin.supportedDistricts") }}</dt><dd class="font-serif text-2xl">{{ n(d.supportedDistricts) }}</dd></div>
              <div><dt class="text-muted">{{ t("admin.statRows") }}</dt><dd class="font-serif text-2xl">{{ n(d.statRows) }}</dd></div>
              <div><dt class="text-muted">{{ t("admin.years") }}</dt><dd class="font-serif text-2xl">{{ d.firstYear ?? "–" }}–{{ d.lastYear ?? "–" }}</dd></div>
              <div><dt class="text-muted">{{ t("admin.weatherCache") }}</dt><dd class="font-serif text-2xl">{{ n(d.weatherCacheEntries) }}</dd></div>
              <div><dt class="text-muted">{{ t("admin.license") }}</dt><dd>{{ d.datasetLicenseStatus ?? "–" }}</dd></div>
            </dl>
          </AppCard>
        </template>
      </QueryState>
    </section>
  </div>
</template>
