<script setup lang="ts">
import { computed, reactive, ref, useId } from "vue";
import { useI18n } from "vue-i18n";
import { LocateFixed, Search } from "lucide-vue-next";
import { locations } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";
import type { District } from "@/lib/api/types";
import type { Lang } from "@/i18n/core";
import { formatNumber } from "@/lib/format";
import { useQuery } from "@/lib/query";
import AppButton from "@/components/ui/AppButton.vue";
import SelectInput from "@/components/ui/SelectInput.vue";
import TextInput from "@/components/ui/TextInput.vue";
import ErrorPanel from "@/components/data/ErrorPanel.vue";

export interface LocationValue {
  stateKey: string;
  districtKey: string;
}

/** State/district picker over the supported-district gazetteer, plus name search and an opt-in GPS button. */
const props = withDefaults(defineProps<{ modelValue: LocationValue; error?: string; allowGps?: boolean }>(), { allowGps: false });
const emit = defineEmits<{ "update:modelValue": [value: LocationValue] }>();

const { t, locale } = useI18n();
const lang = computed(() => locale.value as Lang);
const gps = reactive<{ state: "idle" | "busy" | "ok" | "msg"; text?: string }>({ state: "idle" });
const q = ref("");
const listId = useId();
const term = computed(() => q.value.trim());

const states = useQuery(() => ["states"], locations.states, { staleTime: 3_600_000 });
const districts = useQuery(() => ["districts", props.modelValue.stateKey], () => locations.districts(props.modelValue.stateKey), {
  enabled: () => !!props.modelValue.stateKey,
  staleTime: 3_600_000,
});
const search = useQuery(() => ["location-search", term.value], () => locations.search(term.value), {
  enabled: () => term.value.length >= 2,
  staleTime: 60_000,
});

const choose = (v: LocationValue) => emit("update:modelValue", v);
const stateKey = computed({
  get: () => props.modelValue.stateKey,
  set: (v: string) => choose({ stateKey: v, districtKey: "" }),
});
const districtKey = computed({
  get: () => props.modelValue.districtKey,
  set: (v: string) => choose({ stateKey: props.modelValue.stateKey, districtKey: v }),
});

// Explicit click only. Coordinates are sent once to the server and never stored here.
function findMyLocation() {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    Object.assign(gps, { state: "msg", text: t("location.gpsUnsupported") });
    return;
  }
  Object.assign(gps, { state: "busy", text: undefined });
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      try {
        const d = await locations.nearest(pos.coords.latitude, pos.coords.longitude);
        choose({ stateKey: d.stateKey, districtKey: d.districtKey });
        Object.assign(gps, {
          state: "ok",
          text: t("location.gpsFound", {
            district: d.district,
            state: d.state,
            km: d.distanceKm !== undefined ? formatNumber(d.distanceKm, lang.value) : "?",
          }),
        });
      } catch (e) {
        Object.assign(gps, { state: "msg", text: e instanceof ApiError && e.status === 404 ? t("location.gpsNoneNearby") : t("location.gpsFailed") });
      }
    },
    (err) => Object.assign(gps, { state: "msg", text: err.code === err.PERMISSION_DENIED ? t("location.gpsDenied") : t("location.gpsTimeout") }),
    { timeout: 10000, maximumAge: 0 },
  );
}

function pick(d: District) {
  choose({ stateKey: d.stateKey, districtKey: d.districtKey });
  q.value = "";
}
</script>

<template>
  <ErrorPanel v-if="states.isError" :error="states.error" retryable @retry="states.refetch()" />
  <div v-else class="space-y-4">
    <div v-if="allowGps">
      <AppButton variant="secondary" :disabled="gps.state === 'busy'" @click="findMyLocation">
        <LocateFixed aria-hidden="true" class="h-4 w-4" />
        {{ gps.state === "busy" ? t("location.gpsBusy") : t("location.useMine") }}
      </AppButton>
      <p class="mt-1 text-sm text-ink2">{{ t("location.gpsPrivacy") }}</p>
      <p role="status" class="mt-1 text-sm text-ink2" data-testid="gps-status">{{ gps.text }}</p>
    </div>
    <div class="relative">
      <TextInput
        v-model="q"
        :label="t('location.search')"
        :placeholder="t('location.searchHint')"
        autocomplete="off"
        :aria-controls="term.length >= 2 ? listId : undefined"
      />
      <Search aria-hidden="true" class="pointer-events-none absolute right-3 top-9 h-4 w-4 text-muted" />
      <div v-if="term.length >= 2" :id="listId" class="mt-2" aria-live="polite">
        <p v-if="search.isPending" class="text-sm text-muted">{{ t("common.loading") }}</p>
        <p v-if="search.isError" class="text-sm text-terracotta-ink">{{ t("errors.generic") }}</p>
        <p v-if="search.data && search.data.length === 0" class="text-sm text-muted">{{ t("location.noResults") }}</p>
        <ul v-if="search.data && search.data.length > 0" class="divide-y divide-line rounded-lg border border-line-dark bg-surface">
          <li v-for="d in search.data" :key="`${d.stateKey}/${d.districtKey}`">
            <button type="button" class="flex min-h-11 w-full items-center px-3 text-left text-sm hover:bg-sage2" @click="pick(d)">
              {{ d.district }}, {{ d.state }}
            </button>
          </li>
        </ul>
      </div>
    </div>

    <div class="grid gap-4 sm:grid-cols-2">
      <SelectInput v-model="stateKey" :label="t('location.state')" :disabled="states.isPending">
        <option value="">{{ states.isPending ? t("common.loading") : t("location.chooseState") }}</option>
        <option v-for="s in states.data" :key="s.stateKey" :value="s.stateKey">{{ s.name }}</option>
      </SelectInput>
      <SelectInput v-model="districtKey" :label="t('location.district')" :disabled="!modelValue.stateKey || districts.isPending" :error="error">
        <option value="">{{ districts.isPending && modelValue.stateKey ? t("common.loading") : t("location.chooseDistrict") }}</option>
        <option v-for="d in districts.data" :key="d.districtKey" :value="d.districtKey">{{ d.district }}</option>
      </SelectInput>
    </div>
  </div>
</template>
