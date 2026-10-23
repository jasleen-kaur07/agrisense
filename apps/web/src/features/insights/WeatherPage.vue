<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { weather as weatherApi } from "@/lib/api/endpoints";
import { useQuery } from "@/lib/query";
import { useFarms, useHomeLocation } from "@/composables/queries";
import ErrorPanel from "@/components/data/ErrorPanel.vue";
import QueryState from "@/components/data/QueryState.vue";
import SkeletonBlock from "@/components/data/SkeletonBlock.vue";
import SelectInput from "@/components/ui/SelectInput.vue";
import LinkButton from "@/components/ui/LinkButton.vue";
import AppCard from "@/components/ui/AppCard.vue";
import PageHeader from "@/components/ui/PageHeader.vue";
import WeatherPanel from "@/components/weather/WeatherPanel.vue";

interface Option {
  stateKey: string;
  districtKey: string;
  label: string;
}

const { t } = useI18n();
const { location, pending, error } = useHomeLocation();
const farmsQ = useFarms();
const pick = ref("");

const options = computed(() => {
  const map = new Map<string, Option>();
  const loc = location.value;
  if (loc) map.set(`${loc.stateKey}|${loc.districtKey}`, { ...loc, label: `${loc.district ?? loc.districtKey}, ${loc.state ?? loc.stateKey}` });
  for (const f of farmsQ.data ?? []) {
    const k = `${f.stateKey}|${f.districtKey}`;
    if (!map.has(k)) map.set(k, { stateKey: f.stateKey, districtKey: f.districtKey, label: `${f.district}, ${f.state}` });
  }
  return map;
});
const current = computed(() => {
  const loc = location.value;
  return options.value.get(pick.value) ?? (loc ? options.value.get(`${loc.stateKey}|${loc.districtKey}`) : undefined);
});
const selectedKey = computed({
  get: () => pick.value || (current.value ? `${current.value.stateKey}|${current.value.districtKey}` : ""),
  set: (v: string) => (pick.value = v),
});

const q = useQuery(
  () => ["weather", current.value?.stateKey, current.value?.districtKey],
  () => weatherApi.get(current.value!.stateKey, current.value!.districtKey),
  { enabled: () => !!current.value },
);
</script>

<template>
  <div>
    <PageHeader :kicker="t('nav.insights')" :title="t('weather.pageTitle')" :lead="t('weather.pageLead')" />
    <SkeletonBlock v-if="pending" />
    <ErrorPanel v-else-if="error" :error="error" />
    <AppCard v-else-if="!current">
      <p class="mb-4 text-ink2">{{ t("weather.noLocation") }}</p>
      <LinkButton to="/more/settings" variant="secondary">{{ t("overview.openSettings") }}</LinkButton>
    </AppCard>
    <div v-else class="space-y-5">
      <div v-if="options.size > 1" class="max-w-sm">
        <SelectInput v-model="selectedKey" :label="t('weather.place')">
          <option v-for="[k, o] in [...options.entries()]" :key="k" :value="k">{{ o.label }}</option>
        </SelectInput>
      </div>
      <QueryState :query="q">
        <template #default="{ data: w }"><WeatherPanel :weather="w" variant="full" :place="current.label" /></template>
      </QueryState>
    </div>
  </div>
</template>
