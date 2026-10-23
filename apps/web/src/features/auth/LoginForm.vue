<script setup lang="ts">
import { ref } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { ApiError } from "@/lib/api/errors";
import { useForm } from "@/lib/form";
import { useSessionStore } from "@/stores/session";
import AppButton from "@/components/ui/AppButton.vue";
import AppCard from "@/components/ui/AppCard.vue";
import PageHeader from "@/components/ui/PageHeader.vue";
import TextInput from "@/components/ui/TextInput.vue";
import FormError from "@/components/data/FormError.vue";
import { loginSchema, safeNext } from "./schemas";

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const session = useSessionStore();
const next = typeof route.query.next === "string" ? route.query.next : null;
const formError = ref<{ message: string; traceId?: string } | null>(null);
const form = useForm(() => loginSchema((k) => t(k)), { email: "", password: "" });

const onSubmit = form.submit(async (values) => {
  formError.value = null;
  try {
    const user = await session.login(values);
    await router.replace(user.onboardingCompleted ? safeNext(next, "/overview") : "/onboarding");
  } catch (e) {
    const api = e instanceof ApiError ? e : null;
    if (api?.status === 401) formError.value = { message: t("auth.invalidCredentials") };
    else if (api?.status === 429) formError.value = { message: t("auth.tooManyAttempts") };
    else formError.value = { message: api?.isNetworkError ? t("errors.offlineBody") : t("errors.generic"), traceId: api?.traceId };
    if (api) for (const [field, message] of Object.entries(api.fieldMessages)) form.setError(field, message);
  }
});
</script>

<template>
  <AppCard>
    <PageHeader :title="t('auth.loginTitle')" />
    <form novalidate class="space-y-5" @submit="onSubmit">
      <TextInput v-model="form.values.email" :label="t('auth.email')" type="email" autocomplete="email" inputmode="email" :error="form.errors.email" />
      <TextInput v-model="form.values.password" :label="t('auth.password')" type="password" autocomplete="current-password" :error="form.errors.password" />
      <FormError :message="formError?.message ?? null" :trace-id="formError?.traceId" />
      <AppButton type="submit" class="w-full" :disabled="form.submitting.value">
        {{ form.submitting.value ? t("common.pleaseWait") : t("auth.login") }}
      </AppButton>
    </form>
    <div class="mt-5 flex flex-col gap-1 text-sm">
      <RouterLink class="inline-flex min-h-11 items-center text-olive-ink underline" to="/forgot-password">{{ t("auth.forgotLink") }}</RouterLink>
      <RouterLink class="inline-flex min-h-11 items-center text-olive-ink underline" to="/register">{{ t("auth.noAccount") }}</RouterLink>
    </div>
  </AppCard>
</template>
