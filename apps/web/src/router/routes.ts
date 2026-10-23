import type { RouteRecordRaw, RouteMeta } from "vue-router";

declare module "vue-router" {
  interface RouteMeta {
    /** i18n key (under `titles.`) for document.title. */
    title?: string;
    requiresAuth?: boolean;
    requiresAdmin?: boolean;
    /** Login/register: signed-in users are sent on to the app. */
    guestOnly?: boolean;
  }
}

const app = (title: string, extra: RouteMeta = {}): RouteMeta => ({ title, requiresAuth: true, ...extra });
const guest = (title: string): RouteMeta => ({ title, guestOnly: true });

/** Same URLs as the retired Next.js app. Pages are lazy-loaded (one chunk per route). */
export const routes: RouteRecordRaw[] = [
  {
    path: "/",
    component: () => import("@/components/layout/PublicShell.vue"),
    children: [
      { path: "", name: "landing", component: () => import("@/views/LandingView.vue") },
      { path: "how-it-works", name: "how-it-works", component: () => import("@/views/HowItWorksView.vue"), meta: { title: "how" } },
      { path: "login", name: "login", component: () => import("@/views/LoginView.vue"), meta: guest("login") },
      { path: "register", name: "register", component: () => import("@/views/RegisterView.vue"), meta: guest("register") },
      { path: "forgot-password", name: "forgot-password", component: () => import("@/views/ForgotPasswordView.vue"), meta: { title: "forgot" } },
      { path: "reset-password", name: "reset-password", component: () => import("@/views/ResetPasswordView.vue"), meta: { title: "reset" } },
    ],
  },
  {
    path: "/",
    component: () => import("@/components/layout/AppShell.vue"),
    children: [
      { path: "onboarding", name: "onboarding", component: () => import("@/features/onboarding/OnboardingWizard.vue"), meta: app("onboarding") },
      { path: "overview", name: "overview", component: () => import("@/features/overview/OverviewPage.vue"), meta: app("overview") },
      { path: "crop-advice", name: "crop-advice", component: () => import("@/features/advice/SelectFieldPage.vue"), meta: app("cropAdvice") },
      { path: "crop-advice/analyse", name: "analyse", component: () => import("@/features/advice/AnalysePage.vue"), meta: app("analyse") },
      { path: "crop-advice/result/:id", name: "result", component: () => import("@/features/advice/ResultPage.vue"), props: true, meta: app("result") },
      { path: "crop-advice/result/:id/why", name: "result-why", component: () => import("@/features/advice/WhyPage.vue"), props: true, meta: app("result") },
      { path: "crop-advice/result/:id/compare", name: "result-compare", component: () => import("@/features/advice/ComparePage.vue"), props: true, meta: app("result") },
      { path: "crop-advice/result/:id/action-plan", name: "result-plan", component: () => import("@/features/advice/ActionPlanPage.vue"), props: true, meta: app("result") },
      { path: "insights/weather", name: "insights-weather", component: () => import("@/features/insights/WeatherPage.vue"), meta: app("weather") },
      { path: "insights/prediction", name: "insights-prediction", component: () => import("@/features/insights/PredictionPage.vue"), meta: app("prediction") },
      { path: "insights/fertilizer", name: "insights-fertilizer", component: () => import("@/features/insights/NotAvailablePage.vue"), props: { topic: "fertilizer" }, meta: app("fertilizer") },
      { path: "insights/market", name: "insights-market", component: () => import("@/features/insights/NotAvailablePage.vue"), props: { topic: "market" }, meta: app("market") },
      { path: "more/regional", name: "more-regional", component: () => import("@/features/more/RegionalPage.vue"), meta: app("regional") },
      { path: "more/season", name: "more-season", component: () => import("@/features/more/SeasonPage.vue"), meta: app("season") },
      { path: "more/history", name: "more-history", component: () => import("@/features/more/HistoryPage.vue"), meta: app("history") },
      { path: "more/alerts", name: "more-alerts", component: () => import("@/features/more/AlertsPage.vue"), meta: app("alerts") },
      { path: "more/schemes", name: "more-schemes", component: () => import("@/features/more/SchemesPage.vue"), meta: app("schemes") },
      { path: "more/settings", name: "more-settings", component: () => import("@/features/settings/SettingsPage.vue"), meta: app("settings") },
      { path: "admin", name: "admin", component: () => import("@/features/admin/AdminPage.vue"), meta: app("admin", { requiresAdmin: true }) },
    ],
  },
  { path: "/:pathMatch(.*)*", name: "not-found", component: () => import("@/views/NotFoundView.vue"), meta: { title: "notFound" } },
];
