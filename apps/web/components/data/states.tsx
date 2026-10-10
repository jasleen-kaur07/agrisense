"use client";

import { AlertTriangle, Inbox, WifiOff } from "lucide-react";
import type { ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { ApiError } from "@/lib/api/errors";
import { useT } from "@/lib/i18n/provider";
import { Button } from "@/components/ui/button";
import { Card, Skeleton } from "@/components/ui/misc";

export function ErrorPanel({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const t = useT();
  const api = error instanceof ApiError ? error : null;
  const offline = api?.isNetworkError ?? false;
  const Icon = offline ? WifiOff : AlertTriangle;
  return (
    <Card role="alert" className="border-terracotta/40 bg-terracotta-soft/40">
      <div className="flex items-start gap-3">
        <Icon aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-terracotta-ink" />
        <div className="space-y-2">
          <p className="font-semibold text-ink">{offline ? t("errors.offlineTitle") : t("errors.title")}</p>
          <p className="text-sm text-ink2">
            {offline ? t("errors.offlineBody") : api?.detail || api?.title || t("errors.generic")}
          </p>
          {api?.traceId && (
            <p className="text-xs text-muted">
              {t("errors.traceId")}: <code>{api.traceId}</code>
            </p>
          )}
          {onRetry && (
            <Button variant="secondary" onClick={onRetry}>
              {t("common.retry")}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <Card className="flex flex-col items-center gap-3 py-10 text-center">
      <Inbox aria-hidden className="h-7 w-7 text-olive" />
      <p className="font-serif text-xl text-forest">{title}</p>
      {body && <p className="max-w-md text-sm text-ink2">{body}</p>}
      {action}
    </Card>
  );
}

export function SkeletonBlock({ rows = 3 }: { rows?: number }) {
  const t = useT();
  return (
    <div role="status" aria-live="polite" className="space-y-3" data-testid="loading">
      <span className="sr-only">{t("common.loading")}</span>
      <Skeleton className="h-7 w-1/3" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-14" />
      ))}
    </div>
  );
}

/** Renders loading / error (retry + traceId) / empty / success for a query. */
export function QueryState<T>({
  query,
  isEmpty,
  empty,
  skeleton,
  children,
}: {
  query: UseQueryResult<T>;
  isEmpty?: (data: T) => boolean;
  empty?: ReactNode;
  skeleton?: ReactNode;
  children: (data: T) => ReactNode;
}) {
  if (query.isPending) return <>{skeleton ?? <SkeletonBlock />}</>;
  if (query.isError) return <ErrorPanel error={query.error} onRetry={() => void query.refetch()} />;
  if (isEmpty?.(query.data) && empty) return <>{empty}</>;
  return <>{children(query.data)}</>;
}
