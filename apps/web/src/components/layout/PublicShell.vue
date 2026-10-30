<script setup lang="ts">
import { RouterLink, RouterView } from "vue-router";
import { useI18n } from "vue-i18n";
import AppBrand from "./AppBrand.vue";
import LanguageSwitcher from "./LanguageSwitcher.vue";
import SkipLink from "./SkipLink.vue";
import { buttonClass } from "@/components/ui/button-classes";

const { t } = useI18n();
const product = [
  { to: "/how-it-works", k: "nav.howItWorks" },
  { to: "/register", k: "nav.getStarted" },
];
const account = [
  { to: "/login", k: "auth.login" },
  { to: "/register", k: "auth.createAccount" },
  { to: "/forgot-password", k: "auth.forgotLink" },
];
</script>

<template>
  <SkipLink />
  <header class="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur">
    <div class="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2 sm:px-8">
      <AppBrand />
      <nav :aria-label="t('nav.public')" class="flex items-center gap-1 sm:gap-3">
        <RouterLink to="/how-it-works" class="hidden min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-ink2 hover:bg-sage2 hover:text-forest sm:flex">
          {{ t("nav.howItWorks") }}
        </RouterLink>
        <LanguageSwitcher />
        <div class="hidden items-center gap-2 sm:flex">
          <RouterLink to="/login" :class="buttonClass('ghost')">{{ t("auth.login") }}</RouterLink>
          <RouterLink to="/register" :class="buttonClass('primary')">{{ t("nav.getStarted") }}</RouterLink>
        </div>
      </nav>
    </div>
  </header>
  <main id="main" tabindex="-1" class="mx-auto max-w-6xl px-4 py-10 sm:px-8">
    <RouterView />
  </main>
  <footer class="mt-16 border-t border-line bg-forest text-sage on-dark">
    <div class="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-8 md:grid-cols-[1.6fr_1fr_1fr_1.4fr]">
      <div>
        <p class="font-serif text-2xl text-surface">AgriSense</p>
        <p class="mt-2 max-w-xs text-sm leading-relaxed text-sage/90">{{ t("footer.about") }}</p>
        <p class="mt-4 font-serif italic text-ochre-soft">{{ t("footer.tagline") }}</p>
      </div>
      <nav :aria-label="t('footer.product')">
        <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-ochre-soft">{{ t("footer.product") }}</p>
        <ul class="mt-3 space-y-1">
          <li v-for="l in product" :key="l.k">
            <RouterLink :to="l.to" class="inline-flex min-h-8 items-center text-sm text-sage hover:text-surface hover:underline">{{ t(l.k) }}</RouterLink>
          </li>
        </ul>
      </nav>
      <nav :aria-label="t('footer.account')">
        <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-ochre-soft">{{ t("footer.account") }}</p>
        <ul class="mt-3 space-y-1">
          <li v-for="l in account" :key="l.k">
            <RouterLink :to="l.to" class="inline-flex min-h-8 items-center text-sm text-sage hover:text-surface hover:underline">{{ t(l.k) }}</RouterLink>
          </li>
        </ul>
      </nav>
      <div>
        <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-ochre-soft">{{ t("footer.data") }}</p>
        <p class="mt-3 text-sm leading-relaxed text-sage/90">{{ t("footer.weatherCredit") }}</p>
      </div>
    </div>
    <div class="border-t border-surface/15">
      <p class="mx-auto max-w-6xl px-4 py-4 text-xs text-sage/80 sm:px-8">{{ t("footer.rights") }}</p>
    </div>
  </footer>
</template>
