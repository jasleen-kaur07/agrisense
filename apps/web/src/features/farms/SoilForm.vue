<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { ApiError } from "@/lib/api/errors";
import type { SoilRecord } from "@/lib/api/types";
import { useForm } from "@/lib/form";
import AppButton from "@/components/ui/AppButton.vue";
import TextInput from "@/components/ui/TextInput.vue";
import SubmitError from "@/components/data/SubmitError.vue";
import { isSoilEmpty, recordToSoilValues, soilSchema, soilToRecord } from "./schemas";

/** Optional soil test values, clearly described as not used by the Regional Crop Guide. */
const props = defineProps<{
  soil?: SoilRecord | null;
  save: (r: SoilRecord) => Promise<unknown>;
  remove?: () => Promise<unknown>;
}>();

const { t } = useI18n();
const err = ref<unknown>(null);
const saved = ref(false);
const form = useForm(() => soilSchema((k) => t(k)), recordToSoilValues(props.soil));

const submit = form.submit(async (v) => {
  err.value = null;
  saved.value = false;
  if (isSoilEmpty(v)) {
    err.value = new ApiError({ status: 0, title: "", detail: t("soil.empty") });
    return;
  }
  try {
    await props.save(soilToRecord(v));
    saved.value = true;
  } catch (e) {
    err.value = e;
  }
});
</script>

<template>
  <form novalidate class="space-y-4" @submit="submit">
    <p class="text-sm text-ink2">{{ t("soil.explain") }}</p>
    <div class="grid gap-4 sm:grid-cols-2">
      <TextInput v-model="form.values.nitrogen" :label="t('soil.nitrogen')" inputmode="decimal" :error="form.errors.nitrogen" />
      <TextInput v-model="form.values.phosphorus" :label="t('soil.phosphorus')" inputmode="decimal" :error="form.errors.phosphorus" />
      <TextInput v-model="form.values.potassium" :label="t('soil.potassium')" inputmode="decimal" :error="form.errors.potassium" />
      <TextInput v-model="form.values.ph" :label="t('soil.ph')" inputmode="decimal" :error="form.errors.ph" />
      <TextInput v-model="form.values.testedOn" :label="t('soil.testedOn')" type="date" :error="form.errors.testedOn" />
    </div>
    <p class="text-xs text-muted">{{ t("soil.units") }}</p>
    <SubmitError :error="err" />
    <p v-if="saved" role="status" class="text-sm font-medium text-olive-ink">{{ t("soil.saved") }}</p>
    <div class="flex flex-wrap gap-3">
      <AppButton type="submit" :disabled="form.submitting.value">{{ t("soil.save") }}</AppButton>
      <AppButton v-if="soil && remove" variant="danger" @click="remove()">{{ t("soil.remove") }}</AppButton>
    </div>
  </form>
</template>
