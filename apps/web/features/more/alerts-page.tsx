"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { alerts } from "@/lib/api/endpoints";
import { useI18n } from "@/lib/i18n/provider";
import { formatDateTime } from "@/lib/format";
import { EmptyState, ErrorPanel, QueryState } from "@/components/data/states";
import { Button } from "@/components/ui/button";
import { Badge, Card, PageHeader } from "@/components/ui/misc";

export function AlertsPage() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const q = useQuery({ queryKey: ["alerts", unreadOnly], queryFn: () => alerts.list(unreadOnly) });
  const mark = useMutation({
    mutationFn: (id: string) => alerts.markRead(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["alerts"] }),
  });
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        kicker={t("nav.more")}
        title={t("alerts.title")}
        lead={t("alerts.lead")}
        actions={
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-[#19342d]" checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} />
            {t("alerts.unreadOnly")}
          </label>
        }
      />
      {mark.isError && <div className="mb-4"><ErrorPanel error={mark.error} /></div>}
      <QueryState query={q} isEmpty={(d) => d.length === 0} empty={<EmptyState title={t("alerts.emptyTitle")} body={t("alerts.emptyBody")} />}>
        {(list) => (
          <ul className="space-y-3">
            {list.map((a) => (
              <li key={a.id}>
                <Card className={a.read ? "opacity-80" : "border-line-dark"}>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={a.severity === "WATCH" ? "ochre" : "blue"}>{t(`alerts.severity.${a.severity}`)}</Badge>
                    {!a.read && <Badge tone="olive">{t("alerts.new")}</Badge>}
                    <span className="text-xs text-muted">{formatDateTime(a.createdAt, lang)}</span>
                  </div>
                  <h2 className="mt-2 text-xl">{a.title}</h2>
                  <p className="mt-1 text-[15px] leading-relaxed text-ink2">{a.message}</p>
                  {a.source && <p className="mt-1 text-xs text-muted">{t("alerts.source")}: {a.source}</p>}
                  {!a.read && (
                    <Button variant="secondary" className="mt-3" disabled={mark.isPending} onClick={() => mark.mutate(a.id)}>{t("alerts.markRead")}</Button>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </QueryState>
    </div>
  );
}
