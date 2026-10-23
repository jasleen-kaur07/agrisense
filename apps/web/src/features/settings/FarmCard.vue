<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { farms as farmsApi, fields as fieldsApi } from "@/lib/api/endpoints";
import type { Farm, Field } from "@/lib/api/types";
import { invalidateQueries, useMutation } from "@/lib/query";
import { qk } from "@/composables/queries";
import ErrorPanel from "@/components/data/ErrorPanel.vue";
import AppButton from "@/components/ui/AppButton.vue";
import AppCard from "@/components/ui/AppCard.vue";
import FarmForm from "@/features/farms/FarmForm.vue";
import FieldForm from "@/features/farms/FieldForm.vue";
import type { FarmValues } from "@/features/farms/schemas";
import FieldRow from "./FieldRow.vue";

const props = defineProps<{ farm: Farm; fields: Field[] }>();
const { t } = useI18n();
const mode = ref<"view" | "edit" | "addField">("view");
const del = useMutation(() => farmsApi.remove(props.farm.id), {
  onSuccess: async () => {
    await invalidateQueries(qk.farms);
    await invalidateQueries(qk.fields);
  },
});
async function saveFarm(v: FarmValues) {
  await farmsApi.update(props.farm.id, v);
  await invalidateQueries(qk.farms);
  mode.value = "view";
}
async function addField(v: { name: string; areaAcres: number }) {
  await fieldsApi.create(props.farm.id, v);
  await invalidateQueries(qk.fields);
  mode.value = "view";
}
const confirmDelete = () => {
  if (window.confirm(t("farm.confirmDelete"))) del.mutate();
};
</script>

<template>
  <AppCard>
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 class="text-xl">{{ farm.name }}</h3>
        <p class="text-sm text-ink2">{{ farm.district }}, {{ farm.state }}</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <AppButton variant="secondary" :aria-expanded="mode === 'edit'" @click="mode = mode === 'edit' ? 'view' : 'edit'">{{ t("common.edit") }}</AppButton>
        <AppButton variant="danger" :disabled="del.isPending" :aria-label="t('farm.deleteAria', { name: farm.name })" @click="confirmDelete">{{ t("common.delete") }}</AppButton>
      </div>
    </div>
    <div v-if="del.isError" class="mt-3"><ErrorPanel :error="del.error" /></div>
    <div v-if="mode === 'edit'" class="mt-4 rounded-lg bg-sage2 p-4">
      <FarmForm
        :initial="farm"
        :submit-label="t('common.save')"
        cancellable
        :save="saveFarm"
        @cancel="mode = 'view'"
      />
    </div>
    <ul class="mt-4">
      <li v-if="fields.length === 0" class="border-t border-line pt-4 text-sm text-ink2">{{ t("settings.noFieldsInFarm") }}</li>
      <FieldRow v-for="f in fields" :key="f.id" :field="f" />
    </ul>
    <div v-if="mode === 'addField'" class="mt-2 rounded-lg bg-sage2 p-4">
      <h4 class="mb-3 text-lg">{{ t("field.addTitle") }}</h4>
      <FieldForm
        :submit-label="t('field.create')"
        cancellable
        :save="addField"
        @cancel="mode = 'view'"
      />
    </div>
    <AppButton v-else variant="secondary" class="mt-2" @click="mode = 'addField'">{{ t("field.addTitle") }}</AppButton>
  </AppCard>
</template>
