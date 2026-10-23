<script setup lang="ts">
import { RouterLink } from "vue-router";
import { useI18n } from "vue-i18n";
import { BellRing, CloudSun, FlaskConical, History, Landmark, ListChecks, MapPin, Sprout } from "lucide-vue-next";
import AppBadge from "@/components/ui/AppBadge.vue";
import KickerText from "@/components/ui/KickerText.vue";
import LinkButton from "@/components/ui/LinkButton.vue";
import BrandMark from "@/components/layout/BrandMark.vue";

const { t } = useI18n();
const chips = ["landing.chip1", "landing.chip2", "landing.chip3"];
const stats = [
  { n: "522", k: "landing.statDistricts" },
  { n: "3", k: "landing.statSeasons" },
  { n: "7", k: "landing.statForecast" },
  { n: "2", k: "landing.statLanguages" },
];
const features = [
  { icon: Sprout, k: "landing.feat1", experimental: false },
  { icon: CloudSun, k: "landing.feat2", experimental: false },
  { icon: FlaskConical, k: "landing.feat3", experimental: true },
  { icon: ListChecks, k: "landing.feat4", experimental: false },
  { icon: BellRing, k: "landing.feat5", experimental: false },
  { icon: Landmark, k: "landing.feat6", experimental: false },
];
const steps = [
  { icon: MapPin, k: "landing.step1" },
  { icon: History, k: "landing.step2" },
  { icon: CloudSun, k: "landing.step3" },
];
const honest = ["landing.honest1", "landing.honest2", "landing.honest3", "landing.honest4"];
</script>

<template>
  <div class="-mt-10 space-y-24">
    <!-- Hero -->
    <section class="hero-bg pb-20 pt-14 sm:pt-20">
      <div class="mx-auto grid max-w-6xl gap-12 md:grid-cols-[1.25fr_1fr] md:items-center">
        <div>
          <KickerText class="mb-4">{{ t("landing.kicker") }}</KickerText>
          <h1 class="text-4xl leading-[1.05] sm:text-6xl">{{ t("landing.title") }}</h1>
          <p class="mt-6 max-w-xl text-base leading-relaxed text-ink2 sm:text-lg">{{ t("landing.lead") }}</p>
          <div class="mt-8 flex flex-wrap items-center gap-3">
            <LinkButton to="/register" class="px-7">{{ t("landing.cta") }}</LinkButton>
            <LinkButton to="/how-it-works" variant="secondary">{{ t("landing.secondaryCta") }}</LinkButton>
          </div>
          <p class="mt-4 text-sm text-muted">
            <RouterLink to="/login" class="font-semibold text-olive-ink underline-offset-4 hover:underline">{{ t("landing.signIn") }}</RouterLink>
          </p>
          <ul class="mt-8 flex flex-wrap gap-2">
            <li v-for="c in chips" :key="c" class="rounded-full border border-line-dark bg-surface px-3 py-1 text-xs font-semibold text-ink2">{{ t(c) }}</li>
          </ul>
        </div>
        <div aria-hidden="true" class="relative mx-auto w-full max-w-sm">
          <div class="dot-grid absolute -top-6 right-0 h-40 w-40 rounded-2xl opacity-70 sm:-right-6"></div>
          <div class="relative rounded-3xl bg-forest p-8 shadow-[var(--shadow-lift)]">
            <div class="flex items-center gap-3">
              <BrandMark />
              <span class="font-serif text-xl text-surface">AgriSense</span>
            </div>
            <div class="mt-8 space-y-3">
              <div
                v-for="(f, i) in features.slice(0, 3)"
                :key="f.k"
                class="flex items-center gap-3 rounded-xl bg-surface/10 px-4 py-3 text-sage"
                :style="{ marginLeft: `${i * 14}px` }"
              >
                <component :is="f.icon" class="h-5 w-5 shrink-0 text-ochre-soft" />
                <span class="text-sm font-semibold">{{ t(`${f.k}Title`) }}</span>
              </div>
            </div>
            <div class="mt-8 h-2 rounded-full bg-surface/15"><div class="h-2 w-2/3 rounded-full bg-olive"></div></div>
          </div>
        </div>
      </div>
    </section>

    <!-- Facts -->
    <section class="-mt-12">
      <dl class="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line shadow-[var(--shadow-card)] md:grid-cols-4">
        <div v-for="s in stats" :key="s.k" class="flex flex-col-reverse bg-surface px-6 py-6 text-center">
          <dt class="mt-1 text-sm text-ink2">{{ t(s.k) }}</dt>
          <dd class="font-serif text-4xl text-forest">{{ s.n }}</dd>
        </div>
      </dl>
    </section>

    <!-- Features -->
    <section aria-labelledby="feat-h">
      <KickerText class="mb-2">{{ t("landing.featKicker") }}</KickerText>
      <h2 id="feat-h" class="mb-10 max-w-2xl text-3xl sm:text-4xl">{{ t("landing.featTitle") }}</h2>
      <ul class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <li v-for="f in features" :key="f.k" class="card-lift rounded-xl border border-line bg-surface p-6">
          <div class="mb-4 flex items-start justify-between">
            <span class="grid h-11 w-11 place-items-center rounded-lg bg-sage text-forest">
              <component :is="f.icon" aria-hidden="true" class="h-5 w-5" />
            </span>
            <AppBadge v-if="f.experimental" tone="ochre">{{ t("landing.experimental") }}</AppBadge>
          </div>
          <h3 class="mb-2 text-xl">{{ t(`${f.k}Title`) }}</h3>
          <p class="text-[15px] leading-relaxed text-ink2">{{ t(`${f.k}Body`) }}</p>
        </li>
      </ul>
    </section>

    <!-- Steps -->
    <section aria-labelledby="how-h">
      <KickerText class="mb-2">{{ t("landing.howKicker") }}</KickerText>
      <h2 id="how-h" class="mb-10 text-3xl sm:text-4xl">{{ t("landing.howTitle") }}</h2>
      <ol class="grid gap-5 md:grid-cols-3">
        <li v-for="(s, i) in steps" :key="s.k" class="relative rounded-xl border border-line bg-surface p-6 pt-8">
          <span class="absolute -top-4 left-6 grid h-9 w-9 place-items-center rounded-full bg-forest font-serif text-lg text-surface">{{ i + 1 }}</span>
          <component :is="s.icon" aria-hidden="true" class="mb-3 h-5 w-5 text-olive-ink" />
          <h3 class="mb-2 text-xl">{{ t(`${s.k}Title`) }}</h3>
          <p class="text-[15px] leading-relaxed text-ink2">{{ t(`${s.k}Body`) }}</p>
        </li>
      </ol>
    </section>

    <!-- Honesty -->
    <section aria-labelledby="honest-h" class="rounded-2xl border border-line bg-sage2 p-6 sm:p-10">
      <h2 id="honest-h" class="mb-6 text-3xl">{{ t("landing.honestTitle") }}</h2>
      <ul class="grid gap-x-10 gap-y-4 text-[15px] leading-relaxed text-ink2 sm:grid-cols-2">
        <li v-for="k in honest" :key="k" class="border-l-2 border-olive pl-4">{{ t(k) }}</li>
      </ul>
    </section>

    <!-- Closing call to action -->
    <section aria-labelledby="cta-h" class="on-dark rounded-2xl bg-forest px-6 py-12 text-center sm:px-12">
      <h2 id="cta-h" class="text-3xl !text-surface sm:text-4xl">{{ t("landing.ctaTitle") }}</h2>
      <p class="mx-auto mt-3 max-w-xl text-sage">{{ t("landing.ctaBody") }}</p>
      <div class="mt-7 flex justify-center">
        <LinkButton to="/register" class="px-7 !bg-surface !text-forest hover:!bg-sage">{{ t("landing.cta") }}</LinkButton>
      </div>
    </section>
  </div>
</template>
