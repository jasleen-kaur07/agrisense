<script setup lang="ts">
import { RouterLink, type RouteLocationRaw } from "vue-router";
import { buttonClass, type ButtonVariant } from "./button-classes";

withDefaults(defineProps<{ to: RouteLocationRaw; variant?: ButtonVariant }>(), { variant: "primary" });
</script>

<template>
  <RouterLink :to="to" :class="buttonClass(variant)"><slot /></RouterLink>
</template>
