<script setup lang="ts">
import { computed, useId } from "vue";
import FormField from "./FormField.vue";
import { controlClass } from "./control-classes";

defineOptions({ inheritAttrs: false });
const props = defineProps<{ label: string; hint?: string; error?: string; id?: string }>();
const model = defineModel<string>({ default: "" });
const auto = useId();
const fid = computed(() => props.id ?? auto);
const describedBy = computed(() => (props.error ? `${fid.value}-err` : props.hint ? `${fid.value}-hint` : undefined));
</script>

<template>
  <FormField :label="label" :hint="hint" :error="error" :html-for="fid">
    <input
      :id="fid"
      v-model="model"
      :aria-invalid="error ? true : undefined"
      :aria-describedby="describedBy"
      :class="controlClass"
      v-bind="$attrs"
    />
  </FormField>
</template>
