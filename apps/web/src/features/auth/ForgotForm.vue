<script setup lang="ts">
import { ref } from "vue";
import { RouterLink } from "vue-router";
import { useI18n } from "vue-i18n";
import { auth } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";
import { useForm } from "@/lib/form";
import AppButton from "@/components/ui/AppButton.vue";
import AppCard from "@/components/ui/AppCard.vue";
import PageHeader from "@/components/ui/PageHeader.vue";
import TextInput from "@/components/ui/TextInput.vue";
import FormError from "@/components/data/FormError.vue";
import { forgotSchema } from "./schemas";

const { t } = useI18n();
const sent = ref(false);
const formError = ref<string | null>(null);
const form = useForm(() => forgotSchema((k) => t(k)), { email: "" });

const onSubmit = form.submit(async ({ email }) => {
  formError.value = null;
  try {
    await auth.forgot(email);
    sent.value = true;
  } catch (e) {
    formError.value = e instanceof ApiError && e.status === 429 ? t("auth.tooManyAttempts") : t("errors.generic");
  }
});
</script>

<template>
  <AppCard>
    <PageHeader :title="t('auth.forgotTitle')" :lead="t('auth.forgotLead')" />
    <p v-if="sent" role="status" class="rounded-lg bg-sage px-3 py-3 text-sm text-olive-ink">{{ t("auth.forgotSent") }}</p>
    <form v-else novalidate class="space-y-5" @submit="onSubmit">
      <TextInput v-model="form.values.email" :label="t('auth.email')" type="email" autocomplete="email" :error="form.errors.email" />
      <FormError :message="formError" />
      <AppButton type="submit" class="w-full" :disabled="form.submitting.value">{{ t("auth.sendLink") }}</AppButton>
    </form>
    <RouterLink class="mt-5 inline-flex min-h-11 items-center text-sm text-olive-ink underline" to="/login">{{ t("auth.backToLogin") }}</RouterLink>
  </AppCard>
</template>
