<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { farms, fields } from "@/lib/api/endpoints";
import type { Field } from "@/lib/api/types";
import { invalidateQueries } from "@/lib/query";
import { qk, useFarms, useHomeLocation } from "@/composables/queries";
import SelectInput from "@/components/ui/SelectInput.vue";
import ErrorPanel from "@/components/data/ErrorPanel.vue";
import SkeletonBlock from "@/components/data/SkeletonBlock.vue";
import FarmForm from "./FarmForm.vue";
import FieldForm from "./FieldForm.vue";
import type { FarmValues } from "./schemas";

/** Add a field to an existing farm, or create the first farm then the field. Name + acres only. */
defineProps<{ cancellable?: boolean }>();
const emit = defineEmits<{ created: [field: Field]; cancel: [] }>();

const { t } = useI18n();
const farmQ = useFarms();
const { location: homeLocation } = useHomeLocation();
const farmId = ref("");
const newFarm = ref(false);

const list = computed(() => farmQ.data ?? []);
const showFarmForm = computed(() => list.value.length === 0 || newFarm.value);
const chosen = computed({
  get: () => farmId.value || list.value[0]?.id || "",
  set: (v: string) => (farmId.value = v),
});

async function createFarm(v: FarmValues) {
  const f = await farms.create(v);
  await invalidateQueries(qk.farms);
  farmId.value = f.id;
  newFarm.value = false;
}
async function createField(v: { name: string; areaAcres: number }) {
  const f = await fields.create(chosen.value, v);
  await invalidateQueries(qk.fields);
  emit("created", f);
}
const onFarmCancel = () => (list.value.length > 0 ? (newFarm.value = false) : emit("cancel"));
</script>

<template>
  <SkeletonBlock v-if="farmQ.isPending" :rows="2" />
  <ErrorPanel v-else-if="farmQ.isError" :error="farmQ.error" retryable @retry="farmQ.refetch()" />
  <div v-else-if="showFarmForm" class="space-y-3">
    <h3 class="text-xl">{{ t("farm.addTitle") }}</h3>
    <FarmForm
      :default-location="homeLocation"
      :submit-label="t('farm.create')"
      :save="createFarm"
      :cancellable="list.length > 0 || cancellable"
      @cancel="onFarmCancel"
    />
  </div>
  <div v-else class="space-y-4">
    <h3 class="text-xl">{{ t("field.addTitle") }}</h3>
    <SelectInput v-model="chosen" :label="t('field.farm')">
      <option v-for="f in list" :key="f.id" :value="f.id">{{ f.name }} · {{ f.district }}</option>
    </SelectInput>
    <button type="button" class="min-h-11 text-sm text-olive-ink underline" @click="newFarm = true">{{ t("farm.addAnother") }}</button>
    <FieldForm :submit-label="t('field.create')" :save="createField" :cancellable="cancellable" @cancel="emit('cancel')" />
  </div>
</template>
