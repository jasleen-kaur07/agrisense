<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { regional } from "@/lib/api/endpoints";
import type { Season } from "@/lib/api/types";
import { useQuery } from "@/lib/query";
import { useHomeLocation, useSeason } from "@/composables/queries";
import QueryState from "@/components/data/QueryState.vue";
import PageHeader from "@/components/ui/PageHeader.vue";
import SelectInput from "@/components/ui/SelectInput.vue";
import LocationPicker, { type LocationValue } from "@/components/location/LocationPicker.vue";
import RegionalGuide from "@/components/advice/RegionalGuide.vue";

const SEASONS: Season[] = ["KHARIF", "RABI", "SUMMER"];

const { t } = useI18n();
const { location } = useHomeLocation();
const seasonQ = useSeason();
const picked = ref<LocationValue | null>(null);
const seasonPick = ref<Season | null>(null);

const eff = computed<LocationValue>({
  get: () => picked.value ?? (location.value ? { stateKey: location.value.stateKey, districtKey: location.value.districtKey } : { stateKey: "", districtKey: "" }),
  set: (v) => (picked.value = v),
});
const season = computed(() => seasonPick.value ?? seasonQ.data?.season);
const seasonModel = computed({
  get: () => season.value ?? "",
  set: (v: string) => (seasonPick.value = v as Season),
});
const ready = computed(() => !!eff.value.stateKey && !!eff.value.districtKey && !!season.value);

const q = useQuery(
  () => ["guide", eff.value.stateKey, eff.value.districtKey, season.value],
  () => regional.guide(eff.value.stateKey, eff.value.districtKey, season.value!),
  { enabled: () => ready.value },
);
</script>

<template>
  <div>
    <PageHeader :kicker="t('nav.more')" :title="t('regional.title')" :lead="t('regional.lead')" />
    <div class="mb-8 grid gap-6 lg:grid-cols-[2fr_1fr]">
      <LocationPicker v-model="eff" />
      <SelectInput v-model="seasonModel" :label="t('advice.seasonLabel')">
        <option v-if="!season" value="">{{ t("common.loading") }}</option>
        <option v-for="s in SEASONS" :key="s" :value="s">{{ t(`season.${s}`) }}</option>
      </SelectInput>
    </div>
    <p v-if="!ready" class="text-ink2">{{ t("regional.pickPrompt") }}</p>
    <QueryState v-else :query="q">
      <template #default="{ data: g }"><RegionalGuide :guide="g" /></template>
    </QueryState>
  </div>
</template>
