import { createRouter, createWebHistory, type Router, type RouterHistory } from "vue-router";
import { translate } from "@/i18n";
import { authGuard } from "./guards";
import { routes } from "./routes";

/** "Overview | AgriSense"; the landing page is just "AgriSense". */
export function documentTitle(titleKey?: string): string {
  return titleKey ? `${translate(`titles.${titleKey}`)} | AgriSense` : "AgriSense";
}

export function createAppRouter(history: RouterHistory = createWebHistory()): Router {
  const router = createRouter({
    history,
    routes,
    scrollBehavior: (_to, _from, saved) => saved ?? { top: 0 },
  });
  router.beforeEach(authGuard);
  router.afterEach((to) => {
    document.title = documentTitle(to.meta.title);
  });
  return router;
}
