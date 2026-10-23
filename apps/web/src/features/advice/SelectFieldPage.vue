<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { Plus } from "lucide-vue-next";
import type { Season } from "@/lib/api/types";
import type { Lang } from "@/i18n/core";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/cn";
import { useFarms, useFields, useSeason } from "@/composables/queries";
import AppButton from "@/components/ui/AppButton.vue";
import AppCard from "@/components/ui/AppCard.vue";
import KickerText from "@/components/ui/KickerText.vue";
import PageHeader from "@/components/ui/PageHeader.vue";
import SelectInput from "@/components/ui/SelectInput.vue";
import EmptyState from "@/components/data/EmptyState.vue";
import QueryState from "@/components/data/QueryState.vue";
import AddFieldPanel from "@/features/farms/AddFieldPanel.vue";

const SEASONS: Season[] = ["KHARIF", "RABI", "SUMMER"];

const { t, locale } = useI18n();
const router = useRouter();
const fieldsQ = useFields();
const farmsQ = useFarms();
const seasonQ = useSeason();
const picked = ref<string | null>(null);
const seasonPick = ref<Season | null>(null);
const adding = ref(false);

const season = computed<Season | undefined>(() => seasonPick.value ?? seasonQ.data?.season);
const seasonModel = computed({
  get: () => season.value ?? "",
  set: (v: string) => (seasonPick.value = v as Season),
});
const selected = computed(() => picked.value ?? (fieldsQ.data?.length === 1 ? fieldsQ.data[0]!.id : null));

function describe(f: { farmId: string; farmName?: string; areaAcres: number }): string {
  const farm = farmsQ.data?.find((x) => x.id === f.farmId);
  return [farm ? `${farm.district}, ${farm.state}` : f.farmName, `${formatNumber(f.areaAcres, locale.value as Lang, 2)} ${t("field.acres")}`]
    .filter(Boolean)
    .join(" · ");
}
const start = () => router.push({ path: "/crop-advice/analyse", query: { fieldId: selected.value!, season: season.value! } });
</script>

<template>
  <div>
    <PageHeader :kicker="t('advice.kicker')" :title="t('advice.title')" :lead="t('advice.lead')" />
    <div class="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
      <div class="space-y-6">
        <section aria-labelledby="pick-field">
          <h2 id="pick-field" class="mb-3 text-2xl">{{ t("advice.chooseField") }}</h2>
          <QueryState :query="fieldsQ" :is-empty="(d) => d.length === 0">
            <template #empty>
              <div class="space-y-4">
                <EmptyState :title="t('advice.noFields')" :body="t('advice.noFieldsBody')" />
                <AppCard><AddFieldPanel @created="(f) => (picked = f.id)" /></AppCard>
              </div>
            </template>
            <template #default="{ data: list }">
              <div class="space-y-3">
                <fieldset class="space-y-3">
                  <legend class="sr-only">{{ t("advice.chooseField") }}</legend>
                  <label
                    v-for="f in list"
                    :key="f.id"
                    :class="cn(
                      'flex min-h-14 cursor-pointer items-start gap-3 rounded-lg border bg-surface p-4 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-olive-ink',
                      selected === f.id ? 'border-forest ring-1 ring-forest' : 'border-line-dark',
                    )"
                  >
                    <input type="radio" name="field" class="mt-1 h-4 w-4 accent-[#19342d]" :checked="selected === f.id" @change="picked = f.id" />
                    <span>
                      <span class="block font-semibold text-ink">{{ f.name }}</span>
                      <span class="block text-sm text-ink2">{{ describe(f) }}</span>
                    </span>
                  </label>
                </fieldset>
                <AppCard v-if="adding">
                  <AddFieldPanel cancellable @created="(f) => { picked = f.id; adding = false; }" @cancel="adding = false" />
                </AppCard>
                <AppButton v-else variant="secondary" @click="adding = true"><Plus aria-hidden="true" class="h-4 w-4" />{{ t("advice.addField") }}</AppButton>

                <div class="border-t border-line pt-6">
                  <h2 class="mb-3 text-2xl">{{ t("advice.season") }}</h2>
                  <SelectInput
                    v-model="seasonModel"
                    :label="t('advice.seasonLabel')"
                    :hint="seasonQ.data ? t('advice.seasonHint') : undefined"
                    :disabled="seasonQ.isPending && !seasonPick"
                  >
                    <option v-if="!season" value="">{{ t("common.loading") }}</option>
                    <option v-for="s in SEASONS" :key="s" :value="s">{{ t(`season.${s}`) }}{{ seasonQ.data?.season === s ? ` (${t("season.current")})` : "" }}</option>
                  </SelectInput>
                </div>

                <AppButton :disabled="!selected || !season" @click="start">{{ t("advice.start") }}</AppButton>
              </div>
            </template>
          </QueryState>
        </section>
      </div>

      <aside aria-labelledby="uses-h">
        <AppCard class="bg-sage2">
          <KickerText class="mb-2">{{ t("advice.usesKicker") }}</KickerText>
          <h2 id="uses-h" class="mb-3 text-2xl">{{ t("advice.usesTitle") }}</h2>
          <ul class="list-disc space-y-2 pl-5 text-sm leading-relaxed text-ink2">
            <li>{{ t("advice.uses1") }}</li>
            <li>{{ t("advice.uses2") }}</li>
            <li>{{ t("advice.uses3") }}</li>
          </ul>
          <p class="mt-4 border-t border-line-dark pt-4 text-sm leading-relaxed text-ink2">{{ t("advice.notUsed") }}</p>
        </AppCard>
      </aside>
    </div>
  </div>
</template>
