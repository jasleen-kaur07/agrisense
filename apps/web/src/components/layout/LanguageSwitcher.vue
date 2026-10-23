<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { profile } from "@/lib/api/endpoints";
import { invalidateQueries, useMutation } from "@/lib/query";
import { qk } from "@/composables/queries";
import { useLocaleStore } from "@/stores/locale";
import { useSessionStore } from "@/stores/session";
import type { Lang } from "@/i18n/core";

/** Switches UI language immediately (cookie + localStorage); signed-in users also persist it to /profile. */
const props = withDefaults(defineProps<{ signedIn?: boolean }>(), { signedIn: false });
const { t } = useI18n();
const locale = useLocaleStore();
const session = useSessionStore();

const save = useMutation((l: Lang) => profile.update({ language: l }), {
  onSuccess: async () => {
    await invalidateQueries(qk.profile);
    await session.reload();
  },
});

function choose(l: Lang) {
  if (l === locale.lang) return;
  locale.setLang(l);
  if (props.signedIn) save.mutate(l);
}
const options = [
  { value: "en", label: "EN" },
  { value: "hi", label: "हिं" },
] as const;
</script>

<template>
  <div role="group" :aria-label="t('language.label')" class="inline-flex rounded-lg border border-line-dark bg-surface p-0.5">
    <button
      v-for="o in options"
      :key="o.value"
      type="button"
      :lang="o.value"
      :aria-pressed="locale.lang === o.value"
      :class="[
        'min-h-10 min-w-11 rounded-md px-3 text-sm font-semibold',
        locale.lang === o.value ? 'bg-forest text-surface' : 'text-forest hover:bg-sage2',
      ]"
      @click="choose(o.value)"
    >
      {{ o.label }}
    </button>
  </div>
</template>
