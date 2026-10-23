<script setup lang="ts">
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { profile } from "@/lib/api/endpoints";
import type { ExperienceLevel, Profile } from "@/lib/api/types";
import type { Lang } from "@/i18n/core";
import { invalidateQueries, useMutation } from "@/lib/query";
import { qk, useProfile } from "@/composables/queries";
import { useLocaleStore } from "@/stores/locale";
import { useSessionStore } from "@/stores/session";
import ErrorPanel from "@/components/data/ErrorPanel.vue";
import QueryState from "@/components/data/QueryState.vue";
import AppButton from "@/components/ui/AppButton.vue";
import AppCard from "@/components/ui/AppCard.vue";
import SelectInput from "@/components/ui/SelectInput.vue";
import TextInput from "@/components/ui/TextInput.vue";
import LocationPicker, { type LocationValue } from "@/components/location/LocationPicker.vue";

const { t } = useI18n();
const q = useProfile();
const locale = useLocaleStore();
const session = useSessionStore();

const LEVELS = ["BEGINNER", "INTERMEDIATE", "EXPERIENCED"] as const;

/** Local editable copy of the profile; created when the profile has loaded. */
const draft = ref<{ name: string; lang: Lang; level: ExperienceLevel | ""; loc: LocationValue } | null>(null);
function init(p: Profile) {
  draft.value = {
    name: p.displayName ?? "",
    lang: p.language,
    level: p.experienceLevel ?? "",
    loc: { stateKey: p.preferredStateKey ?? "", districtKey: p.preferredDistrictKey ?? "" },
  };
}
watch(() => q.data, (p) => { if (p && !draft.value) init(p); }, { immediate: true });

const save = useMutation(
  () => {
    const d = draft.value!;
    return profile.update({
      displayName: d.name.trim() || undefined,
      language: d.lang,
      ...(d.level ? { experienceLevel: d.level } : {}),
      ...(d.loc.stateKey && d.loc.districtKey ? { preferredStateKey: d.loc.stateKey, preferredDistrictKey: d.loc.districtKey } : {}),
    });
  },
  {
    onSuccess: async () => {
      locale.setLang(draft.value!.lang);
      void invalidateQueries(qk.profile);
      void session.reload();
    },
  },
);
</script>

<template>
  <AppCard>
    <h2 class="mb-4 text-2xl">{{ t("settings.profileTitle") }}</h2>
    <QueryState :query="q">
      <template #default>
        <form v-if="draft" class="space-y-5" @submit.prevent="save.mutate()">
          <TextInput v-model="draft.name" :label="t('onboarding.nameLabel')" maxlength="80" />
          <SelectInput v-model="draft.lang" :label="t('language.label')">
            <option value="en">English</option>
            <option value="hi">हिन्दी (Hindi)</option>
          </SelectInput>
          <SelectInput v-model="draft.level" :label="t('settings.experience')">
            <option value="">{{ t("settings.notSet") }}</option>
            <option v-for="l in LEVELS" :key="l" :value="l">{{ t(`experience.${l}`) }}</option>
          </SelectInput>
          <div>
            <p class="mb-2 text-sm font-semibold text-ink2">{{ t("settings.homeLocation") }}</p>
            <LocationPicker v-model="draft.loc" />
          </div>
          <ErrorPanel v-if="save.isError" :error="save.error" />
          <p v-if="save.isSuccess" role="status" class="text-sm font-medium text-olive-ink">{{ t("common.saved") }}</p>
          <AppButton type="submit" :disabled="save.isPending">{{ t("common.save") }}</AppButton>
        </form>
      </template>
    </QueryState>
  </AppCard>
</template>
