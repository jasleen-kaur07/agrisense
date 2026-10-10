import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * UX-only route guard. It cannot validate a JWT; it only checks that an auth
 * cookie exists so signed-out visitors land on /login instead of an empty
 * shell. The real check is the API returning 401. Note: as_refresh is scoped
 * to /api/v1/auth, so page requests normally only see as_access; an expired
 * access cookie sends the user to /login?next=..., where the login page tries
 * one silent refresh before showing the form.
 */
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has("as_access") || request.cookies.has("as_refresh");
  if (hasSession) return NextResponse.next();
  const url = request.nextUrl.clone();
  const next = request.nextUrl.pathname + request.nextUrl.search;
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(next)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/onboarding/:path*",
    "/overview/:path*",
    "/crop-advice/:path*",
    "/insights/:path*",
    "/more/:path*",
    "/admin/:path*",
  ],
};
