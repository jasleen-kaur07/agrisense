import { ApiError, parseProblem } from "./errors";

export const API_BASE = "/api/v1";
export const CSRF_COOKIE = "as_csrf";
export const CSRF_HEADER = "X-CSRF-Token";

const UNSAFE = new Set(["POST", "PUT", "PATCH", "DELETE"]);
/** Unsafe calls that do not carry CSRF (no session yet). */
const CSRF_EXEMPT = new Set(["/auth/login", "/auth/register", "/auth/forgot", "/auth/reset"]);
/** Never trigger refresh-and-retry (they are the auth handshake themselves). */
const NO_REFRESH = new Set([...CSRF_EXEMPT, "/auth/refresh"]);

export function readCsrfCookie(): string | null {
  if (typeof document === "undefined") return null;
  for (const part of document.cookie.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === CSRF_COOKIE) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
  /** Do not redirect to /login when the session is gone (used by session probes). */
  noRedirect?: boolean;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = API_BASE + path;
  if (!query) return url;
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  const qs = sp.toString();
  return qs ? `${url}?${qs}` : url;
}

let refreshInFlight: Promise<boolean> | null = null;

/** One shared refresh at a time. Resolves true when cookies were rotated. */
export function refreshSession(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await send("/auth/refresh", { method: "POST" });
        return res.ok;
      } catch {
        return false;
      } finally {
        setTimeout(() => {
          refreshInFlight = null;
        }, 0);
      }
    })();
  }
  return refreshInFlight;
}

async function send(path: string, opts: RequestOptions): Promise<Response> {
  const method = opts.method ?? "GET";
  const headers: Record<string, string> = { Accept: "application/json", ...opts.headers };
  let body: string | undefined;
  if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }
  if (UNSAFE.has(method) && !CSRF_EXEMPT.has(path)) {
    const token = readCsrfCookie();
    if (token) headers[CSRF_HEADER] = token;
  }
  try {
    return await fetch(buildUrl(path, opts.query), {
      method,
      headers,
      body,
      credentials: "include",
      signal: opts.signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new ApiError({ status: 0, title: "Network error", detail: "Could not reach the server." });
  }
}

export function redirectToLogin(): void {
  if (typeof window === "undefined") return;
  if (window.location.pathname.startsWith("/login")) return;
  const next = window.location.pathname + window.location.search;
  window.location.assign(`/login?next=${encodeURIComponent(next)}`);
}

export async function apiFetch<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
  let res = await send(path, opts);

  if (res.status === 401 && !NO_REFRESH.has(path)) {
    const refreshed = await refreshSession();
    if (refreshed) {
      res = await send(path, opts);
    }
    if (res.status === 401) {
      if (!opts.noRedirect) redirectToLogin();
      throw await parseProblem(res);
    }
  }

  if (!res.ok) throw await parseProblem(res);
  if (res.status === 204 || (res.status === 202 && !res.headers.get("content-type"))) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const api = {
  get: <T>(path: string, query?: RequestOptions["query"], o: RequestOptions = {}) =>
    apiFetch<T>(path, { ...o, method: "GET", query }),
  post: <T>(path: string, body?: unknown, o: RequestOptions = {}) =>
    apiFetch<T>(path, { ...o, method: "POST", body }),
  put: <T>(path: string, body?: unknown, o: RequestOptions = {}) =>
    apiFetch<T>(path, { ...o, method: "PUT", body }),
  patch: <T>(path: string, body?: unknown, o: RequestOptions = {}) =>
    apiFetch<T>(path, { ...o, method: "PATCH", body }),
  delete: <T>(path: string, o: RequestOptions = {}) => apiFetch<T>(path, { ...o, method: "DELETE" }),
};
