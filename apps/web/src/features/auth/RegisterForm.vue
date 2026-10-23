<script setup lang="ts">
import { ref } from "vue";
import { RouterLink, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { ApiError } from "@/lib/api/errors";
import { useForm } from "@/lib/form";
import { useLocaleStore } from "@/stores/locale";
import { useSessionStore } from "@/stores/session";
import AppButton from "@/components/ui/AppButton.vue";
import AppCard from "@/components/ui/AppCard.vue";
import PageHeader from "@/components/ui/PageHeader.vue";
import TextInput from "@/components/ui/TextInput.vue";
import FormError from "@/components/data/FormError.vue";
import { registerSchema } from "./schemas";

const { t } = useI18n();
const router = useRouter();
const session = useSessionStore();
const locale = useLocaleStore();
const formError = ref<{ message: string; traceId?: string } | null>(null);
const form = useForm(() => registerSchema((k) => t(k)), { displayName: "", email: "", password: "" });

const onSubmit = form.submit(async (values) => {
  formError.value = null;
  try {
    const user = await session.register({
      email: values.email,
      password: values.password,
      displayName: values.displayName?.trim() || undefined,
      language: locale.lang,
    });
    await router.replace(user.onboardingCompleted ? "/overview" : "/onboarding");
  } catch (e) {
    const api = e instanceof ApiError ? e : null;
    if (api?.status === 409) formError.value = { message: t("auth.emailTaken") };
    else if (api?.status === 429) formError.value = { message: t("auth.tooManyAttempts") };
    else formError.value = { message: api?.isNetworkError ? t("errors.offlineBody") : api?.detail || t("errors.generic"), traceId: api?.traceId };
    if (api) for (const [field, message] of Object.entries(api.fieldMessages)) form.setError(field, message);
  }
});
</script>

<template>
  <AppCard>
    <PageHeader :title="t('auth.registerTitle')" :lead="t('auth.registerLead')" />
    <form novalidate class="space-y-5" @submit="onSubmit">
      <TextInput v-model="form.values.displayName" :label="t('auth.displayName')" :hint="t('common.optional')" autocomplete="name" :error="form.errors.displayName" />
      <TextInput v-model="form.values.email" :label="t('auth.email')" type="email" autocomplete="email" inputmode="email" :error="form.errors.email" />
      <TextInput v-model="form.values.password" :label="t('auth.password')" type="password" autocomplete="new-password" :hint="t('auth.passwordHint')" :error="form.errors.password" />
      <FormError :message="formError?.message ?? null" :trace-id="formError?.traceId" />
      <AppButton type="submit" class="w-full" :disabled="form.submitting.value">
        {{ form.submitting.value ? t("common.pleaseWait") : t("auth.createAccount") }}
      </AppButton>
    </form>
    <RouterLink class="mt-5 inline-flex min-h-11 items-center text-sm text-olive-ink underline" to="/login">{{ t("auth.haveAccount") }}</RouterLink>
  </AppCard>
</template>
