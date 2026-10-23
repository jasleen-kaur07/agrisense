<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { farms as farmsApi } from "@/lib/api/endpoints";
import { invalidateQueries } from "@/lib/query";
import { qk, useFarms, useFields } from "@/composables/queries";
import EmptyState from "@/components/data/EmptyState.vue";
import ErrorPanel from "@/components/data/ErrorPanel.vue";
import SkeletonBlock from "@/components/data/SkeletonBlock.vue";
import AppButton from "@/components/ui/AppButton.vue";
import AppCard from "@/components/ui/AppCard.vue";
import FarmForm from "@/features/farms/FarmForm.vue";
import type { FarmValues } from "@/features/farms/schemas";
import FarmCard from "./FarmCard.vue";

const { t } = useI18n();
const farmsQ = useFarms();
const fieldsQ = useFields();
const adding = ref(false);

async function createFarm(v: FarmValues) {
  await farmsApi.create(v);
  await invalidateQueries(qk.farms);
  adding.value = false;
}
</script>

<template>
  <section aria-labelledby="farms-h" class="space-y-4">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 id="farms-h" class="text-2xl">{{ t("settings.farmsTitle") }}</h2>
        <p class="text-sm text-ink2">{{ t("settings.farmsLead") }}</p>
      </div>
      <AppButton variant="secondary" :aria-expanded="adding" @click="adding = !adding">{{ t("farm.addTitle") }}</AppButton>
    </div>
    <AppCard v-if="adding">
      <FarmForm
        :submit-label="t('farm.create')"
        cancellable
        :save="createFarm"
        @cancel="adding = false"
      />
    </AppCard>
    <SkeletonBlock v-if="farmsQ.isPending || fieldsQ.isPending" />
    <ErrorPanel v-else-if="farmsQ.isError" :error="farmsQ.error" retryable @retry="farmsQ.refetch()" />
    <ErrorPanel v-else-if="fieldsQ.isError" :error="fieldsQ.error" retryable @retry="fieldsQ.refetch()" />
    <EmptyState v-else-if="(farmsQ.data ?? []).length === 0" :title="t('settings.noFarms')" :body="t('settings.noFarmsBody')" />
    <div v-else class="space-y-4">
      <FarmCard v-for="f in farmsQ.data" :key="f.id" :farm="f" :fields="(fieldsQ.data ?? []).filter((x) => x.farmId === f.id)" />
    </div>
  </section>
</template>
