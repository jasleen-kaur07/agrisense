<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { recommendations } from "@/lib/api/endpoints";
import { useRecommendation } from "@/composables/useRecommendation";
import { useQuery } from "@/lib/query";
import QueryState from "@/components/data/QueryState.vue";
import AppButton from "@/components/ui/AppButton.vue";
import PageHeader from "@/components/ui/PageHeader.vue";
import BackLink from "./BackLink.vue";

const MIN = 2;
const MAX = 4;

const props = defineProps<{ id: string }>();
const { t } = useI18n();
const q = useRecommendation(() => props.id);
const selected = ref<string[]>([]);
const submitted = ref<string[] | null>(null);
const cmp = useQuery(
  () => ["compare", props.id, submitted.value],
  () => recommendations.compare(props.id, submitted.value!),
  { enabled: () => !!submitted.value },
);

function toggle(crop: string) {
  submitted.value = null;
  const s = selected.value;
  selected.value = s.includes(crop) ? s.filter((c) => c !== crop) : s.length < MAX ? [...s, crop] : s;
}
</script>

<template>
  <div>
    <BackLink :to="`/crop-advice/result/${id}`">{{ t("why.back") }}</BackLink>
    <PageHeader :kicker="t('compare.kicker')" :title="t('compare.title')" :lead="t('compare.lead', { min: MIN, max: MAX })" />
    <QueryState :query="q">
      <template #default="{ data: rec }">
        <div class="space-y-8">
          <fieldset>
            <legend class="mb-3 text-sm font-semibold text-ink2">{{ t("compare.choose", { count: selected.length, max: MAX }) }}</legend>
            <div class="flex flex-wrap gap-3">
              <label
                v-for="c in rec.regional.crops"
                :key="c.crop"
                :class="[
                  'flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-4 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-olive-ink',
                  selected.includes(c.crop) ? 'border-forest bg-sage' : 'border-line-dark bg-surface',
                  !selected.includes(c.crop) && selected.length >= MAX ? 'opacity-50' : '',
                ]"
              >
                <input
                  type="checkbox"
                  class="h-4 w-4 accent-[#19342d]"
                  :checked="selected.includes(c.crop)"
                  :disabled="!selected.includes(c.crop) && selected.length >= MAX"
                  @change="toggle(c.crop)"
                />
                <span class="text-sm font-medium">{{ c.crop }}</span>
              </label>
            </div>
            <AppButton class="mt-4" :disabled="selected.length < MIN" @click="submitted = [...selected]">{{ t("compare.run") }}</AppButton>
            <p v-if="selected.length < MIN" class="mt-2 text-sm text-muted">{{ t("compare.needTwo", { min: MIN }) }}</p>
          </fieldset>

          <section v-if="submitted" aria-labelledby="cmp-result" aria-live="polite">
            <h2 id="cmp-result" class="sr-only">{{ t("compare.title") }}</h2>
            <QueryState :query="cmp">
              <template #default="{ data }">
                <div class="space-y-4">
                  <div class="overflow-x-auto rounded-[10px] border border-line bg-surface">
                    <table class="w-full min-w-[480px] text-left text-sm">
                      <caption class="sr-only">{{ t("compare.title") }}</caption>
                      <thead>
                        <tr class="border-b border-line">
                          <th scope="col" class="p-3 font-semibold text-muted"><span class="sr-only">{{ t("compare.measure") }}</span></th>
                          <th v-for="c in data.crops" :key="c" scope="col" class="p-3 font-serif text-lg font-normal text-forest">{{ c }}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="r in data.rows" :key="r.label" class="border-b border-line last:border-0">
                          <th scope="row" class="p-3 font-semibold text-ink2">
                            {{ r.label }}
                            <span v-if="r.source" class="block text-xs font-normal text-muted">{{ r.source }}</span>
                          </th>
                          <td v-for="(v, i) in r.values" :key="i" class="p-3">{{ v ?? t("compare.notAvailable") }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <ul v-if="data.notes.length > 0" class="list-disc space-y-1 pl-5 text-sm text-ink2">
                    <li v-for="n in data.notes" :key="n">{{ n }}</li>
                  </ul>
                </div>
              </template>
            </QueryState>
          </section>
        </div>
      </template>
    </QueryState>
  </div>
</template>
