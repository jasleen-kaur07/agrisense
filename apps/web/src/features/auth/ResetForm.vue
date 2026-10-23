<script setup lang="ts">
import { onBeforeUnmount, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { auth } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";
import { useForm } from "@/lib/form";
import AppButton from "@/components/ui/AppButton.vue";
import AppCard from "@/components/ui/AppCard.vue";
import PageHeader from "@/components/ui/PageHeader.vue";
import TextInput from "@/components/ui/TextInput.vue";
import FormError from "@/components/data/FormError.vue";
import { resetSchema } from "./schemas";

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const token = typeof route.query.token === "string" ? route.query.token : "";
const done = ref(false);
const formError = ref<string | null>(null);
const form = useForm(() => resetSchema((k) => t(k)), { newPassword: "", confirm: "" });
let timer: ReturnType<typeof setTimeout> | undefined;
onBeforeUnmount(() => clearTimeout(timer));

const onSubmit = form.submit(async ({ newPassword }) => {
  formError.value = null;
  try {
    await auth.reset(token, newPassword);
    done.value = true;
    timer = setTimeout(() => void router.replace("/login"), 1500);
  } catch (e) {
    formError.value = e instanceof ApiError && e.status === 400 ? t("auth.resetInvalid") : t("errors.generic");
  }
});
</script>

<template>
  <AppCard v-if="!token"><p role="alert" class="text-terracotta-ink">{{ t("auth.resetMissingToken") }}</p></AppCard>
  <AppCard v-else>
    <PageHeader :title="t('auth.resetTitle')" />
    <p v-if="done" role="status" class="rounded-lg bg-sage px-3 py-3 text-sm text-olive-ink">{{ t("auth.resetDone") }}</p>
    <form v-else novalidate class="space-y-5" @submit="onSubmit">
      <TextInput v-model="form.values.newPassword" :label="t('auth.newPassword')" type="password" autocomplete="new-password" :hint="t('auth.passwordHint')" :error="form.errors.newPassword" />
      <TextInput v-model="form.values.confirm" :label="t('auth.confirmPassword')" type="password" autocomplete="new-password" :error="form.errors.confirm" />
      <FormError :message="formError" />
      <AppButton type="submit" class="w-full" :disabled="form.submitting.value">{{ t("auth.setPassword") }}</AppButton>
    </form>
  </AppCard>
</template>
