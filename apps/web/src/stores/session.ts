import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { auth } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";
import type { User } from "@/lib/api/types";
import { clearQueries } from "@/lib/query";

/**
 * Who is signed in. Cookies are HttpOnly, so the SPA cannot look at them: the only way to know is
 * `GET /auth/me` (the API client does one silent refresh + retry on 401). The router guard awaits
 * `ensureLoaded()` once per page load; 401 means "signed out", anything else is a load error.
 */
export const useSessionStore = defineStore("session", () => {
  const user = ref<User | null>(null);
  const loaded = ref(false);
  const loading = ref(false);
  /** Set when /auth/me failed for a reason other than 401 (network, 5xx). */
  const error = ref<unknown>(null);
  let inflight: Promise<void> | null = null;

  const isAdmin = computed(() => !!user.value?.roles.includes("ADMIN"));

  function load(): Promise<void> {
    inflight ??= (async () => {
      loading.value = true;
      try {
        user.value = await auth.me(true);
        error.value = null;
      } catch (e) {
        const signedOut = e instanceof ApiError && e.status === 401;
        if (signedOut) user.value = null;
        error.value = signedOut ? null : e;
      } finally {
        loaded.value = true;
        loading.value = false;
        inflight = null;
      }
    })();
    return inflight;
  }

  /** Resolves once the session is known. Retries after a failed load. */
  function ensureLoaded(): Promise<void> {
    if (loaded.value && !error.value) return Promise.resolve();
    return load();
  }

  /** Re-read the user (after profile changes). */
  const reload = load;

  function setUser(next: User) {
    clearQueries();
    user.value = next;
    error.value = null;
    loaded.value = true;
  }

  async function login(body: { email: string; password: string }): Promise<User> {
    const u = await auth.login(body);
    setUser(u);
    return u;
  }

  async function register(body: { email: string; password: string; displayName?: string; language?: string }): Promise<User> {
    const u = await auth.register(body);
    setUser(u);
    return u;
  }

  async function logout(): Promise<void> {
    try {
      await auth.logout();
    } catch {
      /* cookies are cleared server-side; leave regardless */
    }
    clear();
  }

  function clear() {
    clearQueries();
    user.value = null;
    error.value = null;
    loaded.value = true;
  }

  return { user, loaded, loading, error, isAdmin, ensureLoaded, reload, setUser, login, register, logout, clear };
});
