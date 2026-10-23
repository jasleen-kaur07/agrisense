<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { fields as fieldsApi } from "@/lib/api/endpoints";
import type { Field, SoilRecord } from "@/lib/api/types";
import type { Lang } from "@/i18n/core";
import { formatNumber } from "@/lib/format";
import { invalidateQueries, useMutation } from "@/lib/query";
import { qk } from "@/composables/queries";
import ErrorPanel from "@/components/data/ErrorPanel.vue";
import AppBadge from "@/components/ui/AppBadge.vue";
import AppButton from "@/components/ui/AppButton.vue";
import FieldForm from "@/features/farms/FieldForm.vue";
import SoilForm from "@/features/farms/SoilForm.vue";

const props = defineProps<{ field: Field }>();
const { t, locale } = useI18n();
const mode = ref<"view" | "edit" | "soil">("view");
const refresh = () => invalidateQueries(qk.fields);
const del = useMutation(() => fieldsApi.remove(props.field.id), { onSuccess: refresh });
async function saveField(v: { name: string; areaAcres: number }) {
  await fieldsApi.update(props.field.id, { ...v, ...(props.field.soil ? { soil: props.field.soil } : {}) });
  await refresh();
  mode.value = "view";
}
async function saveSoil(r: SoilRecord) {
  await fieldsApi.saveSoil(props.field.id, r);
  await refresh();
}
async function removeSoil() {
  await fieldsApi.removeSoil(props.field.id);
  await refresh();
  mode.value = "view";
}
const confirmDelete = () => {
  if (window.confirm(t("field.confirmDelete"))) del.mutate();
};
</script>

<template>
  <li class="border-t border-line py-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p class="font-semibold text-ink">{{ field.name }}</p>
        <p class="text-sm text-ink2">
          {{ formatNumber(field.areaAcres, locale as Lang, 2) }} {{ t("field.acres") }}
          <AppBadge v-if="field.soil" tone="olive" class="ml-2">{{ t("soil.stored") }}</AppBadge>
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <AppButton variant="secondary" :aria-expanded="mode === 'edit'" @click="mode = mode === 'edit' ? 'view' : 'edit'">{{ t("common.edit") }}</AppButton>
        <AppButton variant="secondary" :aria-expanded="mode === 'soil'" @click="mode = mode === 'soil' ? 'view' : 'soil'">{{ t("soil.section") }}</AppButton>
        <AppButton variant="danger" :disabled="del.isPending" :aria-label="t('field.deleteAria', { name: field.name })" @click="confirmDelete">{{ t("common.delete") }}</AppButton>
      </div>
    </div>
    <div v-if="del.isError" class="mt-3"><ErrorPanel :error="del.error" /></div>
    <div v-if="mode === 'edit'" class="mt-4 rounded-lg bg-sage2 p-4">
      <FieldForm
        :initial="field"
        :submit-label="t('common.save')"
        cancellable
        :save="saveField"
        @cancel="mode = 'view'"
      />
    </div>
    <div v-if="mode === 'soil'" class="mt-4 rounded-lg bg-sage2 p-4">
      <h3 class="mb-2 text-xl">{{ t("soil.section") }}</h3>
      <SoilForm
        :soil="field.soil"
        :save="saveSoil"
        :remove="removeSoil"
      />
    </div>
  </li>
</template>
