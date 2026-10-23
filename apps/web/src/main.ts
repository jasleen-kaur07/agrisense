import { createApp, watch } from "vue";
import { createPinia } from "pinia";
import { z } from "zod";
import App from "./App.vue";
import { i18n } from "./i18n";
import { createAppRouter, documentTitle } from "./router";
import { useLocaleStore } from "./stores/locale";
import "./assets/main.css";

// The CSP forbids eval; Zod's JIT parser probes `new Function` and would log a violation, so use the interpreter.
z.config({ jitless: true });

const app = createApp(App);
const pinia = createPinia();
const router = createAppRouter();

app.use(pinia);
app.use(i18n);
app.use(router);

// <html lang> and the page title follow the selected language.
const locale = useLocaleStore();
watch(
  () => locale.lang,
  () => {
    document.title = documentTitle(router.currentRoute.value.meta.title);
  },
);

app.mount("#app");

// Production only. The worker never caches /api/* or authenticated pages (see public/sw.js).
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      /* installability is optional */
    });
  });
}
