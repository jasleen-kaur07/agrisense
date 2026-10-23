import { effectScope } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/errors";
import { clearQueries, invalidateQueries, useMutation, useQuery } from "@/lib/query";
import { flushPromises } from "@vue/test-utils";

describe("query helpers", () => {
  beforeEach(() => clearQueries());

  it("loads, caches within the stale time, and refetches after invalidation", async () => {
    const fn = vi.fn(async () => ({ n: fn.mock.calls.length }));
    const scope = effectScope();
    const q = scope.run(() => useQuery(() => ["thing", 1], fn))!;
    expect(q.isPending).toBe(true);
    await flushPromises();
    expect(q.data).toEqual({ n: 1 });
    scope.run(() => useQuery(() => ["thing", 1], fn));
    await flushPromises();
    expect(fn).toHaveBeenCalledTimes(1);
    await invalidateQueries(["thing"]);
    expect(q.data).toEqual({ n: 2 });
    scope.stop();
  });

  it("does not retry 4xx and exposes the error", async () => {
    const fn = vi.fn(async () => {
      throw new ApiError({ status: 404, title: "Not found" });
    });
    const scope = effectScope();
    const q = scope.run(() => useQuery(() => ["missing"], fn))!;
    await flushPromises();
    expect(q.isError).toBe(true);
    expect((q.error as ApiError).status).toBe(404);
    expect(fn).toHaveBeenCalledTimes(1);
    scope.stop();
  });

  it("stays pending while disabled", async () => {
    const fn = vi.fn(async () => 1);
    const scope = effectScope();
    const q = scope.run(() => useQuery(() => ["off"], fn, { enabled: () => false }))!;
    await flushPromises();
    expect(q.isPending).toBe(true);
    expect(fn).not.toHaveBeenCalled();
    scope.stop();
  });

  it("mutations track pending/success/error", async () => {
    const ok = useMutation(async (v: number) => v * 2);
    expect(await ok.mutateAsync(2)).toBe(4);
    expect(ok.isSuccess).toBe(true);
    const bad = useMutation(async () => {
      throw new Error("no");
    });
    await expect(bad.mutateAsync()).rejects.toThrow("no");
    expect(bad.isError).toBe(true);
  });
});
