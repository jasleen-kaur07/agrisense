<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import type { Farm } from "@/lib/api/types";
import { useForm } from "@/lib/form";
import AppButton from "@/components/ui/AppButton.vue";
import TextInput from "@/components/ui/TextInput.vue";
import LocationPicker, { type LocationValue } from "@/components/location/LocationPicker.vue";
import SubmitError from "@/components/data/SubmitError.vue";
import { farmSchema, type FarmValues } from "./schemas";

const props = defineProps<{
  initial?: Pick<Farm, "name" | "stateKey" | "districtKey">;
  defaultLocation?: { stateKey: string; districtKey: string } | null;
  submitLabel: string;
  save: (v: FarmValues) => Promise<unknown>;
  cancellable?: boolean;
}>();
const emit = defineEmits<{ cancel: [] }>();

const { t } = useI18n();
const err = ref<unknown>(null);
const form = useForm(() => farmSchema((k) => t(k)), {
  name: props.initial?.name ?? "",
  stateKey: props.initial?.stateKey ?? props.defaultLocation?.stateKey ?? "",
  districtKey: props.initial?.districtKey ?? props.defaultLocation?.districtKey ?? "",
});

const location = computed<LocationValue>({
  get: () => ({ stateKey: form.values.stateKey, districtKey: form.values.districtKey }),
  set: (v) => {
    form.values.stateKey = v.stateKey;
    form.values.districtKey = v.districtKey;
  },
});

const submit = form.submit(async (v) => {
  err.value = null;
  try {
    await props.save(v);
  } catch (e) {
    err.value = e;
  }
});
</script>

<template>
  <form novalidate class="space-y-5" @submit="submit">
    <TextInput v-model="form.values.name" :label="t('farm.name')" :error="form.errors.name" />
    <LocationPicker v-model="location" allow-gps :error="form.errors.districtKey ?? form.errors.stateKey" />
    <SubmitError :error="err" />
    <div class="flex flex-wrap gap-3">
      <AppButton type="submit" :disabled="form.submitting.value">{{ form.submitting.value ? t("common.pleaseWait") : submitLabel }}</AppButton>
      <AppButton v-if="cancellable" variant="secondary" @click="emit('cancel')">{{ t("common.cancel") }}</AppButton>
    </div>
  </form>
</template>
