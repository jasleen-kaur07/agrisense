import { createPinia, setActivePinia } from "pinia";
import { vi } from "vitest";
import { i18n } from "@/i18n";

export const json = (status: number, body?: unknown, headers: Record<string, string> = {}) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "content-type": status >= 400 ? "application/problem+json" : "application/json", ...headers },
  });

export function setLocale(lang: "en" | "hi") {
  i18n.global.locale.value = lang;
}

/** Fresh pinia + English UI for each test. */
export function freshApp() {
  const pinia = createPinia();
  setActivePinia(pinia);
  setLocale("en");
  return pinia;
}

export const stubFetch = (impl: (url: string, init?: RequestInit) => Response | Promise<Response>) => {
  const mock = vi.fn(async (url: string, init?: RequestInit) => impl(url, init));
  vi.stubGlobal("fetch", mock);
  return mock;
};
