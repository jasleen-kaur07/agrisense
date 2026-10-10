"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { recommendations } from "@/lib/api/endpoints";
import { useI18n } from "@/lib/i18n/provider";
import { formatDateTime } from "@/lib/format";
import { EmptyState, QueryState } from "@/components/data/states";
import { Button, LinkButton } from "@/components/ui/button";
import { Card, PageHeader } from "@/components/ui/misc";

export function HistoryPage() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const [page, setPage] = useState(0);
  const q = useQuery({ queryKey: ["recommendations", page], queryFn: () => recommendations.list(page, 10) });
  const del = useMutation({
    mutationFn: (id: string) => recommendations.remove(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["recommendations"] }),
  });
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader kicker={t("nav.more")} title={t("history.title")} lead={t("history.lead")} />
      <QueryState
        query={q}
        isEmpty={(d) => d.items.length === 0}
        empty={<EmptyState title={t("history.emptyTitle")} body={t("history.emptyBody")} action={<LinkButton href="/crop-advice">{t("overview.cta")}</LinkButton>} />}
      >
        {(data) => (
          <div className="space-y-4">
            <ul className="space-y-3">
              {data.items.map((r) => (
                <li key={r.id}>
                  <Card className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <Link href={`/crop-advice/result/${r.id}`} className="inline-flex min-h-11 items-center font-serif text-xl text-forest underline-offset-2 hover:underline">
                        {[r.fieldName, r.location.district ?? r.regional.district].filter(Boolean).join(" · ")}
                      </Link>
                      <p className="text-sm text-ink2">
                        {t(`season.${r.season}`)} · {formatDateTime(r.createdAt, lang)}
                      </p>
                      {r.regional.crops[0] && (
                        <p className="text-sm text-ink2">{t("history.topHistorical", { crop: r.regional.crops[0].crop })}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <LinkButton href={`/crop-advice/result/${r.id}`} variant="secondary">{t("history.open")}</LinkButton>
                      <Button
                        variant="ghost"
                        disabled={del.isPending}
                        aria-label={t("history.deleteAria", { name: r.fieldName ?? "" })}
                        onClick={() => { if (window.confirm(t("history.confirmDelete"))) del.mutate(r.id); }}
                      >
                        {t("common.delete")}
                      </Button>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
            {data.totalPages > 1 && (
              <nav aria-label={t("history.pagination")} className="flex items-center justify-between">
                <Button variant="secondary" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>{t("common.previous")}</Button>
                <span className="text-sm text-ink2">{t("history.pageOf", { page: page + 1, total: data.totalPages })}</span>
                <Button variant="secondary" disabled={page + 1 >= data.totalPages} onClick={() => setPage((p) => p + 1)}>{t("common.next")}</Button>
              </nav>
            )}
          </div>
        )}
      </QueryState>
    </div>
  );
}
