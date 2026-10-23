"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { admin } from "@/lib/api/endpoints";
import { useI18n } from "@/lib/i18n/provider";
import { formatDateTime, formatNumber } from "@/lib/format";
import { useMe } from "@/lib/hooks/queries";
import { EmptyState, ErrorPanel, QueryState } from "@/components/data/states";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/form";
import { Card, PageHeader } from "@/components/ui/misc";
import { cn } from "@/lib/cn";

type Tab = "overview" | "users" | "recs" | "feedback";

function Overview() {
  const { t, lang } = useI18n();
  const stats = useQuery({ queryKey: ["admin", "stats"], queryFn: admin.stats });
  const summary = useQuery({ queryKey: ["admin", "summary"], queryFn: admin.dataSummary });
  const n = (v: number | undefined) => (v === undefined ? "–" : formatNumber(v, lang));
  return (
    <div className="space-y-8">
      <section aria-labelledby="ad-stats">
        <h2 id="ad-stats" className="mb-3 text-2xl">{t("admin.stats")}</h2>
        <QueryState query={stats}>
          {(s) => (
            <dl className="grid gap-4 sm:grid-cols-5">
              {(["users", "farms", "fields", "recommendations", "feedback"] as const).map((k) => (
                <Card key={k}>
                  <dt className="text-sm text-muted">{t(`admin.stat.${k}`)}</dt>
                  <dd className="font-serif text-3xl text-forest">{n(s[k])}</dd>
                </Card>
              ))}
            </dl>
          )}
        </QueryState>
      </section>
      <section aria-labelledby="ad-data">
        <h2 id="ad-data" className="mb-3 text-2xl">{t("admin.dataSummary")}</h2>
        <QueryState query={summary}>
          {(d) => (
            <Card>
              <dl className="grid gap-4 text-sm sm:grid-cols-3">
                <div><dt className="text-muted">{t("admin.districts")}</dt><dd className="font-serif text-2xl">{n(d.districts)}</dd></div>
                <div><dt className="text-muted">{t("admin.supportedDistricts")}</dt><dd className="font-serif text-2xl">{n(d.supportedDistricts)}</dd></div>
                <div><dt className="text-muted">{t("admin.statRows")}</dt><dd className="font-serif text-2xl">{n(d.statRows)}</dd></div>
                <div><dt className="text-muted">{t("admin.years")}</dt><dd className="font-serif text-2xl">{d.firstYear ?? "–"}–{d.lastYear ?? "–"}</dd></div>
                <div><dt className="text-muted">{t("admin.weatherCache")}</dt><dd className="font-serif text-2xl">{n(d.weatherCacheEntries)}</dd></div>
                <div><dt className="text-muted">{t("admin.license")}</dt><dd>{d.datasetLicenseStatus ?? "–"}</dd></div>
              </dl>
            </Card>
          )}
        </QueryState>
      </section>
    </div>
  );
}

function Users() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const [page, setPage] = useState(0);
  const [qText, setQText] = useState("");
  const [term, setTerm] = useState("");
  const q = useQuery({ queryKey: ["admin", "users", page, term], queryFn: () => admin.users(page, 20, term || undefined) });
  const toggle = useMutation({
    mutationFn: (v: { id: string; enabled: boolean }) => admin.patchUser(v.id, { enabled: v.enabled }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
  return (
    <div className="space-y-4">
      <form className="flex items-end gap-3" onSubmit={(e) => { e.preventDefault(); setPage(0); setTerm(qText.trim()); }}>
        <div className="max-w-xs flex-1"><TextInput label={t("admin.searchUsers")} value={qText} onChange={(e) => setQText(e.target.value)} /></div>
        <Button type="submit" variant="secondary">{t("common.search")}</Button>
      </form>
      {toggle.isError && <ErrorPanel error={toggle.error} />}
      <QueryState query={q} isEmpty={(d) => d.items.length === 0} empty={<EmptyState title={t("admin.noUsers")} />}>
        {(d) => (
          <>
            <div className="overflow-x-auto rounded-[10px] border border-line bg-surface">
              <table className="w-full min-w-[560px] text-left text-sm">
                <caption className="sr-only">{t("admin.users")}</caption>
                <thead>
                  <tr className="border-b border-line text-muted">
                    <th scope="col" className="p-3">{t("auth.email")}</th>
                    <th scope="col" className="p-3">{t("admin.roles")}</th>
                    <th scope="col" className="p-3">{t("admin.created")}</th>
                    <th scope="col" className="p-3">{t("admin.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {d.items.map((u) => (
                    <tr key={u.id} className="border-b border-line last:border-0">
                      <th scope="row" className="p-3 font-medium">{u.email}</th>
                      <td className="p-3">{u.roles.join(", ")}</td>
                      <td className="p-3">{formatDateTime(u.createdAt, lang)}</td>
                      <td className="p-3">
                        <Button
                          variant={u.enabled ? "secondary" : "primary"}
                          className="min-h-11"
                          disabled={toggle.isPending}
                          aria-label={t(u.enabled ? "admin.disableAria" : "admin.enableAria", { email: u.email })}
                          onClick={() => toggle.mutate({ id: u.id, enabled: !u.enabled })}
                        >
                          {u.enabled ? t("admin.disable") : t("admin.enable")}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between">
              <Button variant="secondary" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>{t("common.previous")}</Button>
              <span className="text-sm text-ink2">{t("history.pageOf", { page: page + 1, total: Math.max(1, d.totalPages) })}</span>
              <Button variant="secondary" disabled={page + 1 >= d.totalPages} onClick={() => setPage((p) => p + 1)}>{t("common.next")}</Button>
            </div>
          </>
        )}
      </QueryState>
    </div>
  );
}

function Recs() {
  const { t, lang } = useI18n();
  const [page, setPage] = useState(0);
  const q = useQuery({ queryKey: ["admin", "recs", page], queryFn: () => admin.recommendations(page, 20) });
  return (
    <QueryState query={q} isEmpty={(d) => d.items.length === 0} empty={<EmptyState title={t("admin.noRecs")} />}>
      {(d) => (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-[10px] border border-line bg-surface">
            <table className="w-full min-w-[560px] text-left text-sm">
              <caption className="sr-only">{t("admin.recs")}</caption>
              <thead>
                <tr className="border-b border-line text-muted">
                  <th scope="col" className="p-3">{t("admin.created")}</th>
                  <th scope="col" className="p-3">{t("admin.field")}</th>
                  <th scope="col" className="p-3">{t("location.district")}</th>
                  <th scope="col" className="p-3">{t("advice.seasonLabel")}</th>
                </tr>
              </thead>
              <tbody>
                {d.items.map((r) => (
                  <tr key={r.id} className="border-b border-line last:border-0">
                    <td className="p-3">{formatDateTime(r.createdAt, lang)}</td>
                    <td className="p-3">{r.fieldName ?? "–"}</td>
                    <td className="p-3">{r.location.district ?? r.regional.district}</td>
                    <td className="p-3">{t(`season.${r.season}`)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between">
            <Button variant="secondary" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>{t("common.previous")}</Button>
            <span className="text-sm text-ink2">{t("history.pageOf", { page: page + 1, total: Math.max(1, d.totalPages) })}</span>
            <Button variant="secondary" disabled={page + 1 >= d.totalPages} onClick={() => setPage((p) => p + 1)}>{t("common.next")}</Button>
          </div>
        </div>
      )}
    </QueryState>
  );
}

function Feedback() {
  const { t, lang } = useI18n();
  const q = useQuery({ queryKey: ["admin", "feedback"], queryFn: admin.feedback });
  return (
    <QueryState query={q} isEmpty={(d) => d.length === 0} empty={<EmptyState title={t("admin.noFeedback")} />}>
      {(items) => (
        <ul className="space-y-3">
          {items.map((f, i) => (
            <li key={f.id ?? i}>
              <Card>
                <p className="text-xs text-muted">
                  {[f.category, f.rating ? `${f.rating}/5` : null, f.createdAt ? formatDateTime(f.createdAt, lang) : null].filter(Boolean).join(" · ")}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-[15px]">{f.message}</p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </QueryState>
  );
}

export function AdminPage() {
  const { t } = useI18n();
  const me = useMe();
  const [tab, setTab] = useState<Tab>("overview");
  const tabs: Tab[] = ["overview", "users", "recs", "feedback"];

  if (me.data && !me.data.roles.includes("ADMIN")) {
    return (
      <Card role="alert">
        <h1 className="mb-2 text-2xl">{t("admin.forbiddenTitle")}</h1>
        <p className="text-ink2">{t("admin.forbiddenBody")}</p>
      </Card>
    );
  }
  return (
    <div>
      <PageHeader kicker={t("nav.admin")} title={t("admin.title")} lead={t("admin.lead")} />
      <div role="tablist" aria-label={t("admin.title")} className="mb-6 flex flex-wrap gap-2 border-b border-line">
        {tabs.map((k) => (
          <button
            key={k}
            role="tab"
            id={`tab-${k}`}
            aria-selected={tab === k}
            aria-controls={`panel-${k}`}
            type="button"
            onClick={() => setTab(k)}
            className={cn("min-h-11 border-b-2 px-4 text-sm font-semibold", tab === k ? "border-olive-ink text-olive-ink" : "border-transparent text-ink2")}
          >
            {t(`admin.tab.${k}`)}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "overview" && <Overview />}
        {tab === "users" && <Users />}
        {tab === "recs" && <Recs />}
        {tab === "feedback" && <Feedback />}
      </div>
    </div>
  );
}
