import { computed, getCurrentScope, onScopeDispose, reactive, ref, shallowRef, toValue, watch, type MaybeRefOrGetter } from "vue";
import { ApiError } from "@/lib/api/errors";

/**
 * Tiny server-state helper (no framework dependency beyond Vue):
 * keyed in-memory cache with a stale time, in-flight de-duplication, one retry for transient failures,
 * prefix invalidation and mutations. Behaviour mirrors what the legacy React app got from TanStack Query.
 */

export type QueryKey = readonly unknown[];

interface Entry {
  data: unknown;
  at: number;
}
interface Active {
  key: () => QueryKey;
  refetch: () => Promise<void>;
}

const cache = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();
const active = new Set<Active>();

const keyString = (k: QueryKey) => JSON.stringify(k);
const matchesPrefix = (key: QueryKey, prefix: QueryKey) =>
  prefix.length <= key.length && prefix.every((p, i) => JSON.stringify(p) === JSON.stringify(key[i]));

export interface QueryOptions {
  enabled?: MaybeRefOrGetter<boolean>;
  /** Milliseconds a cached result counts as fresh. */
  staleTime?: number;
}

export interface Query<T> {
  readonly data: T | undefined;
  readonly error: unknown;
  /** True until the first result (or error) arrives; stays true while the query is disabled. */
  readonly isPending: boolean;
  readonly isError: boolean;
  readonly isSuccess: boolean;
  readonly isFetching: boolean;
  refetch: () => Promise<void>;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const RETRY_DELAY_MS = 1000;

async function fetchWithRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ApiError && e.status >= 400 && e.status < 500) throw e;
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    await sleep(RETRY_DELAY_MS);
    return fn();
  }
}

export function useQuery<T>(key: () => QueryKey, fn: () => Promise<T>, opts: QueryOptions = {}): Query<T> {
  const staleTime = opts.staleTime ?? 30_000;
  const data = shallowRef<T | undefined>(undefined);
  const error = shallowRef<unknown>(null);
  const status = ref<"pending" | "error" | "success">("pending");
  const isFetching = ref(false);
  let token = 0;

  const enabled = () => (opts.enabled === undefined ? true : !!toValue(opts.enabled));

  async function run(force: boolean): Promise<void> {
    if (!enabled()) return;
    const k = keyString(key());
    const hit = cache.get(k);
    if (!force && hit && Date.now() - hit.at < staleTime) {
      data.value = hit.data as T;
      error.value = null;
      status.value = "success";
      return;
    }
    const mine = ++token;
    isFetching.value = true;
    let p = inflight.get(k) as Promise<T> | undefined;
    if (!p) {
      p = fetchWithRetry(fn).finally(() => inflight.delete(k));
      inflight.set(k, p);
    }
    try {
      const result = await p;
      cache.set(k, { data: result, at: Date.now() });
      if (mine !== token) return;
      data.value = result;
      error.value = null;
      status.value = "success";
    } catch (e) {
      if (mine !== token) return;
      error.value = e;
      status.value = "error";
    } finally {
      if (mine === token) isFetching.value = false;
    }
  }

  const self: Active = { key, refetch: () => run(true) };
  active.add(self);

  watch(
    () => [keyString(key()), enabled()] as const,
    () => {
      // A new key starts from scratch: show the cached value if fresh, else the pending state.
      data.value = undefined;
      error.value = null;
      status.value = "pending";
      void run(false);
    },
    { immediate: true },
  );

  if (getCurrentScope()) {
    onScopeDispose(() => {
      active.delete(self);
      token++;
    });
  }

  return reactive({
    data,
    error,
    isPending: computed(() => status.value === "pending"),
    isError: computed(() => status.value === "error"),
    isSuccess: computed(() => status.value === "success"),
    isFetching,
    refetch: () => run(true),
  }) as unknown as Query<T>;
}

/** Drop cached results under `prefix` and refetch every mounted query that matches. */
export async function invalidateQueries(prefix: QueryKey): Promise<void> {
  for (const [k] of cache) {
    try {
      if (matchesPrefix(JSON.parse(k) as QueryKey, prefix)) cache.delete(k);
    } catch {
      cache.delete(k);
    }
  }
  await Promise.all([...active].filter((a) => matchesPrefix(a.key(), prefix)).map((a) => a.refetch()));
}

/** Put a known result into the cache (used after a mutation returned it). */
export function setQueryData(key: QueryKey, data: unknown): void {
  cache.set(keyString(key), { data, at: Date.now() });
}

/** Forget everything (login, logout: nothing from another session may linger). */
export function clearQueries(): void {
  cache.clear();
  inflight.clear();
}

export interface MutationOptions<V, R> {
  onSuccess?: (result: R, variables: V) => void | Promise<void>;
}

export function useMutation<V = void, R = unknown>(fn: (v: V) => Promise<R>, opts: MutationOptions<V, R> = {}) {
  const state = reactive({
    isPending: false,
    isError: false,
    isSuccess: false,
    error: null as unknown,
  });

  async function mutateAsync(v: V): Promise<R> {
    state.isPending = true;
    state.isError = false;
    state.isSuccess = false;
    state.error = null;
    try {
      const r = await fn(v);
      state.isSuccess = true;
      await opts.onSuccess?.(r, v);
      return r;
    } catch (e) {
      state.isError = true;
      state.error = e;
      throw e;
    } finally {
      state.isPending = false;
    }
  }
  const mutate = (v: V) => {
    mutateAsync(v).catch(() => undefined);
  };
  const reset = () => {
    state.isPending = false;
    state.isError = false;
    state.isSuccess = false;
    state.error = null;
  };
  return Object.assign(state, { mutate, mutateAsync, reset });
}
