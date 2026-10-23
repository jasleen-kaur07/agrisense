<script setup lang="ts">
import { buttonClass, type ButtonVariant } from "./button-classes";

withDefaults(defineProps<{ variant?: ButtonVariant; type?: "button" | "submit" | "reset" }>(), {
  variant: "primary",
  type: "button",
});
</script>

<template>
  <button :type="type" :class="buttonClass(variant)"><slot /></button>
</template>
