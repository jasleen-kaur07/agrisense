<script setup lang="ts">
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useSessionStore } from "@/stores/session";
import AppButton from "@/components/ui/AppButton.vue";
import AppCard from "@/components/ui/AppCard.vue";
import PageHeader from "@/components/ui/PageHeader.vue";
import ProfileSection from "./ProfileSection.vue";
import FarmsSection from "./FarmsSection.vue";
import FeedbackSection from "./FeedbackSection.vue";

const { t } = useI18n();
const router = useRouter();
const session = useSessionStore();

async function signOut() {
  await session.logout();
  await router.replace("/login");
}
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-10">
    <PageHeader :kicker="t('nav.more')" :title="t('nav.settings')" />
    <ProfileSection />
    <FarmsSection />
    <FeedbackSection />
    <AppCard class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-2xl">{{ t("settings.signOutTitle") }}</h2>
        <p class="text-sm text-ink2">{{ t("settings.signOutLead") }}</p>
      </div>
      <AppButton variant="secondary" @click="signOut">{{ t("settings.signOut") }}</AppButton>
    </AppCard>
  </div>
</template>
