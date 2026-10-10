"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { recommendations } from "@/lib/api/endpoints";
import { useT } from "@/lib/i18n/provider";
import { useRecommendation } from "./hooks";
import { QueryState } from "@/components/data/states";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/misc";

const MIN = 2;
const MAX = 4;

export function ComparePage({ id }: { id: string }) {
  const t = useT();
  const q = useRecommendation(id);
  const [selected, setSelected] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState<string[] | null>(null);
  const cmp = useQuery({
    queryKey: ["compare", id, submitted],
    queryFn: () => recommendations.compare(id, submitted!),
    enabled: !!submitted,
  });

  const toggle = (crop: string) => {
    setSubmitted(null);
    setSelected((s) => (s.includes(crop) ? s.filter((c) => c !== crop) : s.length < MAX ? [...s, crop] : s));
  };

  return (
    <div>
      <Link href={`/crop-advice/result/${id}`} className="mb-4 inline-flex min-h-11 items-center gap-1 text-sm text-olive-ink underline">
        <ArrowLeft aria-hidden className="h-4 w-4" />{t("why.back")}
      </Link>
      <PageHeader kicker={t("compare.kicker")} title={t("compare.title")} lead={t("compare.lead", { min: MIN, max: MAX })} />
      <QueryState query={q}>
        {(rec) => (
          <div className="space-y-8">
            <fieldset>
              <legend className="mb-3 text-sm font-semibold text-ink2">{t("compare.choose", { count: selected.length, max: MAX })}</legend>
              <div className="flex flex-wrap gap-3">
                {rec.regional.crops.map((c) => {
                  const on = selected.includes(c.crop);
                  const disabled = !on && selected.length >= MAX;
                  return (
                    <label
                      key={c.crop}
                      className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-4 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-olive-ink ${on ? "border-forest bg-sage" : "border-line-dark bg-surface"} ${disabled ? "opacity-50" : ""}`}
                    >
                      <input type="checkbox" className="h-4 w-4 accent-[#19342d]" checked={on} disabled={disabled} onChange={() => toggle(c.crop)} />
                      <span className="text-sm font-medium">{c.crop}</span>
                    </label>
                  );
                })}
              </div>
              <Button className="mt-4" disabled={selected.length < MIN} onClick={() => setSubmitted(selected)}>{t("compare.run")}</Button>
              {selected.length < MIN && <p className="mt-2 text-sm text-muted">{t("compare.needTwo", { min: MIN })}</p>}
            </fieldset>

            {submitted && (
              <section aria-labelledby="cmp-result" aria-live="polite">
                <h2 id="cmp-result" className="sr-only">{t("compare.title")}</h2>
                <QueryState query={cmp}>
                  {(data) => (
                    <div className="space-y-4">
                      <div className="overflow-x-auto rounded-[10px] border border-line bg-surface">
                        <table className="w-full min-w-[480px] text-left text-sm">
                          <caption className="sr-only">{t("compare.title")}</caption>
                          <thead>
                            <tr className="border-b border-line">
                              <th scope="col" className="p-3 font-semibold text-muted"><span className="sr-only">{t("compare.measure")}</span></th>
                              {data.crops.map((c) => <th key={c} scope="col" className="p-3 font-serif text-lg font-normal text-forest">{c}</th>)}
                            </tr>
                          </thead>
                          <tbody>
                            {data.rows.map((r) => (
                              <tr key={r.label} className="border-b border-line last:border-0">
                                <th scope="row" className="p-3 font-semibold text-ink2">
                                  {r.label}
                                  {r.source && <span className="block text-xs font-normal text-muted">{r.source}</span>}
                                </th>
                                {r.values.map((v, i) => <td key={i} className="p-3">{v ?? t("compare.notAvailable")}</td>)}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {data.notes.length > 0 && (
                        <ul className="list-disc space-y-1 pl-5 text-sm text-ink2">{data.notes.map((n) => <li key={n}>{n}</li>)}</ul>
                      )}
                    </div>
                  )}
                </QueryState>
              </section>
            )}
          </div>
        )}
      </QueryState>
    </div>
  );
}
