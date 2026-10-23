<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { RouterLink, RouterView, useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { Menu, WifiOff, X } from "lucide-vue-next";
import AppBrand from "./AppBrand.vue";
import DesktopMenu from "./DesktopMenu.vue";
import LanguageSwitcher from "./LanguageSwitcher.vue";
import SkipLink from "./SkipLink.vue";
import { buildNav, isActivePath } from "./nav-config";
import ErrorPanel from "@/components/data/ErrorPanel.vue";
import SkeletonBlock from "@/components/data/SkeletonBlock.vue";
import { useOnline } from "@/composables/useOnline";
import { useLocaleStore } from "@/stores/locale";
import { useSessionStore } from "@/stores/session";

const { t } = useI18n();
const route = useRoute();
const session = useSessionStore();
const locale = useLocaleStore();
const online = useOnline();
const mobileOpen = ref(false);

const path = computed(() => route.path);
const user = computed(() => session.user);
const nav = computed(() => buildNav(session.isAdmin));
const inOnboarding = computed(() => path.value.startsWith("/onboarding"));

watch(user, (u) => {
  if (u) locale.adoptUserLang(u.language);
}, { immediate: true });
// Close the mobile panel whenever the route changes.
watch(path, () => {
  mobileOpen.value = false;
});
</script>

<template>
  <SkipLink />
  <header class="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur">
    <div class="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 sm:px-8">
      <AppBrand :to="user?.onboardingCompleted ? '/overview' : '/'" />
      <nav v-if="!inOnboarding && user" :aria-label="t('nav.main')" class="hidden items-center gap-1 md:flex">
        <template v-for="item in nav" :key="item.key">
          <DesktopMenu v-if="'menu' in item" :label="item.key" :items="item.menu" :path="path" />
          <RouterLink
            v-else
            :to="item.href"
            :aria-current="isActivePath(path, item.href) ? 'page' : undefined"
            :class="[
              'flex min-h-11 items-center border-b-2 px-3 text-sm font-semibold',
              isActivePath(path, item.href) ? 'border-olive-ink text-olive-ink' : 'border-transparent text-ink2 hover:text-forest',
            ]"
          >
            {{ t(item.key) }}
          </RouterLink>
        </template>
      </nav>
      <div class="flex items-center gap-2">
        <LanguageSwitcher :signed-in="!!user" />
        <button
          v-if="!inOnboarding && user"
          type="button"
          class="flex h-11 w-11 items-center justify-center rounded-lg border border-line-dark bg-surface md:hidden"
          :aria-expanded="mobileOpen"
          aria-controls="mobile-nav"
          :aria-label="mobileOpen ? t('nav.closeMenu') : t('nav.openMenu')"
          @click="mobileOpen = !mobileOpen"
        >
          <X v-if="mobileOpen" aria-hidden="true" class="h-5 w-5" />
          <Menu v-else aria-hidden="true" class="h-5 w-5" />
        </button>
      </div>
    </div>
    <nav v-if="mobileOpen && user" id="mobile-nav" :aria-label="t('nav.main')" class="border-t border-line bg-surface px-4 pb-4 md:hidden">
      <ul class="space-y-1 py-2">
        <li v-for="item in nav" :key="item.key">
          <template v-if="'menu' in item">
            <p class="px-3 pt-3 text-[11px] font-bold uppercase tracking-[0.14em] text-olive-ink">{{ t(item.key) }}</p>
            <ul>
              <li v-for="i in item.menu" :key="i.href">
                <RouterLink
                  :to="i.href"
                  :aria-current="isActivePath(path, i.href) ? 'page' : undefined"
                  :class="['flex min-h-11 items-center rounded-md px-3 text-[15px]', isActivePath(path, i.href) ? 'bg-sage font-semibold text-olive-ink' : 'text-ink']"
                >
                  {{ t(i.key) }}
                </RouterLink>
              </li>
            </ul>
          </template>
          <RouterLink
            v-else
            :to="item.href"
            :aria-current="isActivePath(path, item.href) ? 'page' : undefined"
            :class="['flex min-h-11 items-center rounded-md px-3 text-[15px] font-semibold', isActivePath(path, item.href) ? 'bg-sage text-olive-ink' : 'text-ink']"
          >
            {{ t(item.key) }}
          </RouterLink>
        </li>
      </ul>
    </nav>
  </header>

  <div v-if="!online" role="status" class="flex items-center justify-center gap-2 bg-ochre-soft px-4 py-2 text-sm text-ochre-ink">
    <WifiOff aria-hidden="true" class="h-4 w-4" />
    {{ t("errors.offlineBanner") }}
  </div>

  <main id="main" tabindex="-1" class="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-10">
    <SkeletonBlock v-if="session.loading && !user" :rows="4" />
    <ErrorPanel v-else-if="session.error && !user" :error="session.error" retryable @retry="session.reload()" />
    <SkeletonBlock v-else-if="user && !user.onboardingCompleted && !inOnboarding" :rows="2" />
    <RouterView v-else />
  </main>
  <footer class="on-dark mt-12 bg-forest text-sage">
    <div class="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-8">
      <p class="font-serif italic text-ochre-soft">{{ t("footer.tagline") }}</p>
      <p class="text-sage/90">{{ t("footer.weatherCredit") }}</p>
      <p class="text-xs text-sage/80">{{ t("footer.rights") }}</p>
    </div>
  </footer>
</template>
