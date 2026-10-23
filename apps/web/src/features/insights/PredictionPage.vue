<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { z } from "zod";
import { predictions } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";
import type { CropPrediction } from "@/lib/api/types";
import type { Lang } from "@/i18n/core";
import { formatNumber } from "@/lib/format";
import { useForm } from "@/lib/form";
import AppBadge from "@/components/ui/AppBadge.vue";
import AppButton from "@/components/ui/AppButton.vue";
import AppCard from "@/components/ui/AppCard.vue";
import LinkButton from "@/components/ui/LinkButton.vue";
import PageHeader from "@/components/ui/PageHeader.vue";
import TextInput from "@/components/ui/TextInput.vue";
import SubmitError from "@/components/data/SubmitError.vue";

/**
 * Experimental soil-test prediction (Model 1). Every value is typed by the user; nothing is imputed
 * and no weather/rainfall is fetched (the rainfall period of the training data is undocumented).
 * Ranges mirror the model's training ranges; the server validates them again.
 */
const FIELDS = [
  { key: "nitrogen", min: 0, max: 140 },
  { key: "phosphorus", min: 5, max: 145 },
  { key: "potassium", min: 5, max: 205 },
  { key: "temperature", min: 8.8, max: 43.7 },
  { key: "humidity", min: 14.3, max: 100 },
  { key: "ph", min: 3.5, max: 9.9 },
  { key: "rainfall", min: 20.2, max: 298.6 },
] as const;
type Key = (typeof FIELDS)[number]["key"];

const { t, locale } = useI18n();
const lang = () => locale.value as Lang;
const result = ref<CropPrediction | null>(null);
const err = ref<unknown>(null);

const schema = () => {
  const shape = {} as Record<Key, z.ZodType<string>>;
  for (const f of FIELDS) {
    shape[f.key] = z
      .string()
      .trim()
      .min(1, t("prediction.required"))
      .refine((v) => v === "" || Number.isFinite(Number(v)), t("prediction.number"))
      .refine(
        (v) => v === "" || !Number.isFinite(Number(v)) || (Number(v) >= f.min && Number(v) <= f.max),
        t("prediction.outOfRange", { min: f.min, max: f.max }),
      );
  }
  return z.object(shape);
};

const form = useForm(schema, Object.fromEntries(FIELDS.map((f) => [f.key, ""])) as Record<Key, string>);

const submit = form.submit(async (v) => {
  err.value = null;
  result.value = null;
  try {
    result.value = await predictions.crop(Object.fromEntries(FIELDS.map((f) => [f.key, Number(v[f.key])])) as never);
  } catch (e) {
    if (e instanceof ApiError && e.fieldErrors.length > 0) {
      const names: Record<string, Key> = { N: "nitrogen", P: "phosphorus", K: "potassium", temperature: "temperature", humidity: "humidity", ph: "ph", rainfall: "rainfall" };
      for (const fe of e.fieldErrors) {
        const k = names[fe.field] ?? (fe.field as Key);
        if (FIELDS.some((f) => f.key === k)) form.setError(k, fe.message);
      }
    } else {
      err.value = e;
    }
  }
});

function clear() {
  form.reset();
  result.value = null;
  err.value = null;
}
const crop = (name: string) => name.charAt(0).toUpperCase() + name.slice(1);
const feature = (f: string) => t(`prediction.feature.${f}`);
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <PageHeader :kicker="t('nav.insights')" :title="t('prediction.title')" :lead="t('prediction.lead')">
      <template #actions><AppBadge tone="ochre">{{ t("prediction.badge") }}</AppBadge></template>
    </PageHeader>

    <AppCard class="mb-6 space-y-2 border-ochre-ink/30" data-testid="prediction-warning">
      <h2 class="text-lg">{{ t("prediction.warnTitle") }}</h2>
      <ul class="list-disc space-y-1 pl-5 text-sm leading-relaxed text-ink2">
        <li>{{ t("prediction.warn1") }}</li>
        <li>{{ t("prediction.warn2") }}</li>
        <li>{{ t("prediction.warn3") }}</li>
        <li>{{ t("prediction.warn4") }}</li>
      </ul>
    </AppCard>

    <AppCard>
      <h2 class="mb-4 text-lg">{{ t("prediction.formTitle") }}</h2>
      <form novalidate class="space-y-4" data-testid="prediction-form" @submit="submit">
        <div class="grid gap-4 sm:grid-cols-2">
          <TextInput
            v-for="f in FIELDS"
            :key="f.key"
            v-model="form.values[f.key]"
            :label="t(`prediction.${f.key}`)"
            :hint="t('prediction.range', { min: formatNumber(f.min, lang(), 1), max: formatNumber(f.max, lang(), 1) })"
            inputmode="decimal"
            :error="form.errors[f.key]"
          />
        </div>
        <SubmitError :error="err" />
        <div class="flex flex-wrap gap-3">
          <AppButton type="submit" :disabled="form.submitting.value">
            {{ form.submitting.value ? t("prediction.submitting") : t("prediction.submit") }}
          </AppButton>
          <AppButton variant="secondary" @click="clear">{{ t("prediction.reset") }}</AppButton>
        </div>
      </form>
    </AppCard>

    <AppCard v-if="result" class="mt-6 space-y-5" data-testid="prediction-result">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="text-2xl">{{ t("prediction.resultsTitle") }}</h2>
        <AppBadge tone="ochre">{{ t("prediction.badge") }}</AppBadge>
      </div>
      <p class="text-sm text-ink2">{{ result.scoreNote }}</p>
      <ol class="space-y-4">
        <li v-for="r in result.results" :key="r.rank" class="rounded-lg border border-line p-4" data-testid="prediction-item">
          <div class="flex flex-wrap items-baseline justify-between gap-2">
            <p class="text-xl">{{ r.rank }}. {{ crop(r.crop) }}</p>
            <p class="text-sm text-ink2">
              {{ t("prediction.score", { score: formatNumber(r.modelScore, lang(), 2) }) }} · {{ t("prediction.scoreHint") }}
            </p>
          </div>
          <div v-if="r.factors.length" class="mt-3">
            <p class="text-xs font-bold uppercase tracking-wide text-muted">{{ t("prediction.factorsTitle") }}</p>
            <ul class="mt-1 space-y-0.5 text-sm text-ink2">
              <li v-for="f in r.factors.slice(0, 3)" :key="f.feature">
                {{ feature(f.feature) }}: {{ t(`prediction.${f.direction}`) }}
              </li>
            </ul>
          </div>
        </li>
      </ol>
      <div>
        <p class="text-xs font-bold uppercase tracking-wide text-muted">{{ t("prediction.limitationsTitle") }}</p>
        <ul class="mt-1 list-disc space-y-0.5 pl-5 text-sm text-ink2">
          <li v-for="l in result.limitations" :key="l">{{ l }}</li>
        </ul>
        <p class="mt-3 text-xs text-muted">{{ t("prediction.modelLine", { name: result.modelName, version: result.modelVersion }) }}</p>
      </div>
      <LinkButton to="/crop-advice" variant="secondary">{{ t("prediction.toGuide") }}</LinkButton>
    </AppCard>
  </div>
</template>
