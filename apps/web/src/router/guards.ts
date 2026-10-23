import type { NavigationGuard, RouteLocationRaw } from "vue-router";
import { safeNext } from "@/features/auth/schemas";
import { readCsrfCookie } from "@/lib/api/client";
import { useSessionStore } from "@/stores/session";

/**
 * Global guard (UX only, the backend enforces everything).
 * Cookies are HttpOnly, so the session store asks `GET /auth/me` once per page load.
 * - requiresAuth: signed out -> /login?next=...; onboarding unfinished -> /onboarding; ADMIN-only routes need the role.
 * - guestOnly (login/register): signed-in users go on to /overview (or /onboarding). Visitors without the readable
 *   as_csrf cookie cannot have a session, so no request is made for them.
 * A non-401 failure of /auth/me (network, 5xx) lets the navigation through; the app shell shows the error with a retry.
 */
export const authGuard: NavigationGuard = async (to): Promise<true | RouteLocationRaw> => {
  if (!to.meta.requiresAuth && !to.meta.guestOnly) return true;
  const session = useSessionStore();
  // Login/register for someone who never signed in (no readable as_csrf cookie): skip the pointless /auth/me + refresh round trip.
  if (to.meta.guestOnly && !session.user && !readCsrfCookie()) return true;
  await session.ensureLoaded();
  const user = session.user;

  if (to.meta.guestOnly) {
    if (!user) return true;
    if (!user.onboardingCompleted) return "/onboarding";
    const next = typeof to.query.next === "string" ? to.query.next : null;
    return safeNext(next, "/overview");
  }

  if (!user) {
    if (session.error) return true;
    return { path: "/login", query: { next: to.fullPath } };
  }
  if (!user.onboardingCompleted && to.path !== "/onboarding") return "/onboarding";
  if (user.onboardingCompleted && to.path === "/onboarding") return "/overview";
  if (to.meta.requiresAdmin && !user.roles.includes("ADMIN")) return "/overview";
  return true;
};
