<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { z } from "zod";
import { feedback } from "@/lib/api/endpoints";
import type { FeedbackCategory } from "@/lib/api/types";
import { useForm } from "@/lib/form";
import ErrorPanel from "@/components/data/ErrorPanel.vue";
import AppButton from "@/components/ui/AppButton.vue";
import AppCard from "@/components/ui/AppCard.vue";
import SelectInput from "@/components/ui/SelectInput.vue";
import TextArea from "@/components/ui/TextArea.vue";
import { feedbackSchema } from "./schemas";

const CATS: FeedbackCategory[] = ["BUG", "IDEA", "DATA_ISSUE", "OTHER"];

const { t } = useI18n();
const sent = ref(false);
const err = ref<unknown>(null);
const form = useForm<z.infer<ReturnType<typeof feedbackSchema>>>(() => feedbackSchema((k) => t(k)), { category: "IDEA", message: "", rating: "" });

const onSubmit = form.submit(async (v) => {
  err.value = null;
  sent.value = false;
  try {
    await feedback.send({ category: v.category, message: v.message.trim(), ...(v.rating ? { rating: Number(v.rating) } : {}) });
    sent.value = true;
    form.reset();
  } catch (e) {
    err.value = e;
  }
});
</script>

<template>
  <AppCard>
    <h2 class="text-2xl">{{ t("settings.feedbackTitle") }}</h2>
    <p class="mb-4 mt-1 text-sm text-ink2">{{ t("settings.feedbackLead") }}</p>
    <form novalidate class="space-y-4" @submit="onSubmit">
      <SelectInput v-model="form.values.category" :label="t('feedback.category')">
        <option v-for="c in CATS" :key="c" :value="c">{{ t(`feedback.cat.${c}`) }}</option>
      </SelectInput>
      <TextArea v-model="form.values.message" :label="t('feedback.message')" :error="form.errors.message" />
      <SelectInput v-model="form.values.rating" :label="t('feedback.rating')">
        <option value="">{{ t("settings.notSet") }}</option>
        <option v-for="n in [1, 2, 3, 4, 5]" :key="n" :value="String(n)">{{ n }}</option>
      </SelectInput>
      <ErrorPanel v-if="err" :error="err" />
      <p v-if="sent" role="status" class="text-sm font-medium text-olive-ink">{{ t("feedback.thanks") }}</p>
      <AppButton type="submit" :disabled="form.submitting.value">{{ t("feedback.send") }}</AppButton>
    </form>
  </AppCard>
</template>
