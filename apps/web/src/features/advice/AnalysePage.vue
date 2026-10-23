<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { recommendations } from "@/lib/api/endpoints";
import type { Season } from "@/lib/api/types";
import { invalidateQueries, setQueryData, useMutation } from "@/lib/query";
import ErrorPanel from "@/components/data/ErrorPanel.vue";
import AppCard from "@/components/ui/AppCard.vue";
import LinkButton from "@/components/ui/LinkButton.vue";
import PageHeader from "@/components/ui/PageHeader.vue";
import TaskList from "@/components/ui/TaskList.vue";

const SEASONS = ["KHARIF", "RABI", "SUMMER"];

/** Real POST /recommendations; the list reflects the request state, there is no artificial delay. */
const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const fieldId = typeof route.query.fieldId === "string" ? route.query.fieldId : null;
const seasonParam = typeof route.query.season === "string" ? route.query.season : null;
const season = seasonParam && SEASONS.includes(seasonParam) ? (seasonParam as Season) : undefined;
let idempotencyKey = "";

const create = useMutation(() => recommendations.create({ fieldId: fieldId!, season, mode: "REGIONAL" }, idempotencyKey), {
  onSuccess: async (rec) => {
    setQueryData(["recommendation", rec.id], rec);
    void invalidateQueries(["recommendations"]);
    await router.replace(`/crop-advice/result/${rec.id}`);
  },
});

const attempt = ref(0);
function start() {
  attempt.value++;
  idempotencyKey = crypto.randomUUID();
  create.reset();
  create.mutate();
}
onMounted(() => {
  if (fieldId) start();
});

const status = computed(() => (create.isError ? "error" : create.isSuccess ? "done" : "pending"));
</script>

<template>
  <AppCard v-if="!fieldId" role="alert">
    <p class="mb-3">{{ t("analyse.missingField") }}</p>
    <LinkButton to="/crop-advice">{{ t("analyse.back") }}</LinkButton>
  </AppCard>
  <div v-else class="mx-auto max-w-xl">
    <PageHeader :kicker="t('advice.kicker')" :title="t('analyse.title')" :lead="t('analyse.lead')" />
    <AppCard class="space-y-6" aria-live="polite" :aria-busy="status === 'pending'">
      <TaskList
        :items="[
          { label: t('analyse.stepLocation'), status },
          { label: t('analyse.stepRecords'), status },
          { label: t('analyse.stepWeather'), status },
        ]"
      />
      <template v-if="create.isError">
        <ErrorPanel :error="create.error" retryable @retry="start" />
        <LinkButton to="/crop-advice" variant="secondary">{{ t("analyse.back") }}</LinkButton>
      </template>
    </AppCard>
  </div>
</template>
