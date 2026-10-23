<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { farms, fields, profile } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";
import type { ExperienceLevel } from "@/lib/api/types";
import type { Lang } from "@/i18n/core";
import { invalidateQueries } from "@/lib/query";
import { qk } from "@/composables/queries";
import { useLocaleStore } from "@/stores/locale";
import { useSessionStore } from "@/stores/session";
import AppButton from "@/components/ui/AppButton.vue";
import AppCard from "@/components/ui/AppCard.vue";
import PageHeader from "@/components/ui/PageHeader.vue";
import StepsList from "@/components/ui/StepsList.vue";
import TextInput from "@/components/ui/TextInput.vue";
import LocationPicker, { type LocationValue } from "@/components/location/LocationPicker.vue";
import FieldForm from "@/features/farms/FieldForm.vue";
import SubmitError from "@/components/data/SubmitError.vue";
import RadioCards from "./RadioCards.vue";

const { t } = useI18n();
const router = useRouter();
const locale = useLocaleStore();
const session = useSessionStore();

const step = ref(0);
const name = ref(session.user?.displayName ?? "");
const level = ref<ExperienceLevel | null>(null);
const loc = ref<LocationValue>({ stateKey: "", districtKey: "" });
const farmName = ref(t("onboarding.defaultFarmName"));
const busy = ref(false);
const error = ref<unknown>(null);
const locError = ref<string | undefined>();

const labels = computed(() => [t("onboarding.stepProfile"), t("onboarding.stepExperience"), t("onboarding.stepLocation"), t("onboarding.stepField")]);
const lang = computed<Lang>({ get: () => locale.lang, set: (l) => locale.setLang(l) });

async function run(fn: () => Promise<void>, onOk: () => void) {
  busy.value = true;
  error.value = null;
  try {
    await fn();
    onOk();
  } catch (e) {
    error.value = e;
  } finally {
    busy.value = false;
  }
}

async function finish() {
  await profile.update({ onboardingCompleted: true });
  await invalidateQueries(qk.profile);
  await session.reload();
  await router.replace("/overview");
}

const saveProfile = () =>
  run(async () => void (await profile.update({ language: lang.value, ...(name.value.trim() ? { displayName: name.value.trim() } : {}) })), () => (step.value = 1));
const saveLevel = () => run(async () => void (await profile.update({ experienceLevel: level.value! })), () => (step.value = 2));
function saveLocation() {
  if (!loc.value.stateKey || !loc.value.districtKey) {
    locError.value = t("validation.districtRequired");
    return;
  }
  void run(async () => void (await profile.update({ preferredStateKey: loc.value.stateKey, preferredDistrictKey: loc.value.districtKey })), () => (step.value = 3));
}
async function saveField(v: { name: string; areaAcres: number }) {
  if (!farmName.value.trim()) throw new ApiError({ status: 0, title: "", detail: t("validation.nameRequired") });
  error.value = null;
  const farm = await farms.create({ name: farmName.value.trim(), stateKey: loc.value.stateKey, districtKey: loc.value.districtKey });
  await fields.create(farm.id, v);
  await invalidateQueries(qk.farms);
  await invalidateQueries(qk.fields);
  await finish();
}
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <PageHeader :kicker="t('onboarding.kicker')" :title="t('onboarding.title')" :lead="t('onboarding.lead')" />
    <div class="mb-6">
      <StepsList :label="t('onboarding.progress')" :labels="labels" :current="step" />
      <p class="sr-only" aria-live="polite">{{ t("onboarding.stepOf", { n: step + 1, total: 4 }) }}</p>
    </div>
    <AppCard class="space-y-6">
      <template v-if="step === 0">
        <h2 class="text-2xl">{{ t("onboarding.profileTitle") }}</h2>
        <TextInput v-model="name" :label="t('onboarding.nameLabel')" :hint="t('common.optional')" autocomplete="name" maxlength="80" />
        <RadioCards
          v-model="lang"
          :legend="t('language.label')"
          :options="[
            { value: 'en', label: 'English' },
            { value: 'hi', label: 'हिन्दी (Hindi)' },
          ]"
        />
        <SubmitError :error="error" />
        <AppButton :disabled="busy" @click="saveProfile">{{ t("common.continue") }}</AppButton>
      </template>

      <template v-else-if="step === 1">
        <h2 class="text-2xl">{{ t("onboarding.experienceTitle") }}</h2>
        <RadioCards
          v-model="level"
          :legend="t('onboarding.experienceLegend')"
          :options="[
            { value: 'BEGINNER', label: t('experience.BEGINNER'), hint: t('experience.BEGINNERHint') },
            { value: 'INTERMEDIATE', label: t('experience.INTERMEDIATE'), hint: t('experience.INTERMEDIATEHint') },
            { value: 'EXPERIENCED', label: t('experience.EXPERIENCED'), hint: t('experience.EXPERIENCEDHint') },
          ]"
        />
        <SubmitError :error="error" />
        <div class="flex flex-wrap gap-3">
          <AppButton variant="secondary" @click="step = 0">{{ t("common.back") }}</AppButton>
          <AppButton :disabled="busy || !level" @click="saveLevel">{{ t("common.continue") }}</AppButton>
          <AppButton variant="ghost" @click="step = 2">{{ t("common.skip") }}</AppButton>
        </div>
      </template>

      <template v-else-if="step === 2">
        <h2 class="text-2xl">{{ t("onboarding.locationTitle") }}</h2>
        <p class="text-sm text-ink2">{{ t("onboarding.locationLead") }}</p>
        <LocationPicker v-model="loc" allow-gps :error="locError" @update:model-value="locError = undefined" />
        <SubmitError :error="error" />
        <div class="flex flex-wrap gap-3">
          <AppButton variant="secondary" @click="step = 1">{{ t("common.back") }}</AppButton>
          <AppButton :disabled="busy" @click="saveLocation">{{ t("common.continue") }}</AppButton>
        </div>
      </template>

      <template v-else>
        <h2 class="text-2xl">{{ t("onboarding.fieldTitle") }}</h2>
        <p class="text-sm text-ink2">{{ t("onboarding.fieldLead") }}</p>
        <TextInput v-model="farmName" :label="t('farm.name')" maxlength="80" />
        <SubmitError :error="error" />
        <FieldForm :submit-label="t('onboarding.finish')" :save="saveField" cancellable @cancel="step = 2" />
        <div class="border-t border-line pt-4">
          <AppButton variant="ghost" :disabled="busy" @click="run(finish, () => undefined)">{{ t("onboarding.skipField") }}</AppButton>
        </div>
      </template>
    </AppCard>
  </div>
</template>
