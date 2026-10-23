<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import type { Field } from "@/lib/api/types";
import { useForm } from "@/lib/form";
import AppButton from "@/components/ui/AppButton.vue";
import TextInput from "@/components/ui/TextInput.vue";
import SubmitError from "@/components/data/SubmitError.vue";
import { fieldSchema } from "./schemas";

/** Field = name + area in acres only. Soil is never asked here. */
const props = defineProps<{
  initial?: Pick<Field, "name" | "areaAcres">;
  submitLabel: string;
  save: (v: { name: string; areaAcres: number }) => Promise<unknown>;
  cancellable?: boolean;
}>();
const emit = defineEmits<{ cancel: [] }>();

const { t } = useI18n();
const err = ref<unknown>(null);
const form = useForm(() => fieldSchema((k) => t(k)), {
  name: props.initial?.name ?? "",
  areaAcres: props.initial ? String(props.initial.areaAcres) : "",
});

const submit = form.submit(async (v) => {
  err.value = null;
  try {
    await props.save({ name: v.name.trim(), areaAcres: Number(v.areaAcres) });
  } catch (e) {
    err.value = e;
  }
});
</script>

<template>
  <form novalidate class="space-y-5" @submit="submit">
    <TextInput v-model="form.values.name" :label="t('field.name')" :error="form.errors.name" />
    <TextInput v-model="form.values.areaAcres" :label="t('field.area')" :hint="t('field.areaHint')" inputmode="decimal" :error="form.errors.areaAcres" />
    <SubmitError :error="err" />
    <div class="flex flex-wrap gap-3">
      <AppButton type="submit" :disabled="form.submitting.value">{{ form.submitting.value ? t("common.pleaseWait") : submitLabel }}</AppButton>
      <AppButton v-if="cancellable" variant="secondary" @click="emit('cancel')">{{ t("common.cancel") }}</AppButton>
    </div>
  </form>
</template>
