<script setup lang="ts">
import { onErrorCaptured, ref, watch } from "vue";
import { RouterView, useRoute, useRouter } from "vue-router";
import ErrorView from "@/views/ErrorView.vue";

/** App-level error boundary: a render/setup error (or a failed lazy chunk) shows ErrorView instead of a blank page. */
const route = useRoute();
const router = useRouter();
const crashed = ref(false);

onErrorCaptured((err) => {
  console.error(err);
  crashed.value = true;
  return false;
});
router.onError((err) => {
  console.error(err);
  crashed.value = true;
});
watch(() => route.fullPath, () => {
  crashed.value = false;
});

function retry() {
  crashed.value = false;
  // A failed lazy chunk only recovers with a fresh load.
  window.location.reload();
}
</script>

<template>
  <ErrorView v-if="crashed" @retry="retry" />
  <RouterView v-else />
</template>
