"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { recommendations } from "@/lib/api/endpoints";
import type { ActionPlanItem } from "@/lib/api/types";
import { useT } from "@/lib/i18n/provider";
import { useRecommendation } from "./hooks";
import { QueryState } from "@/components/data/states";
import { Badge, Card, PageHeader } from "@/components/ui/misc";
import { buttonClass } from "@/components/ui/button";

const KINDS: ActionPlanItem["kind"][] = ["DATA_INSIGHT", "CHECKLIST", "OFFICIAL_RESOURCE"];

function Plan({ id, crop }: { id: string; crop: string }) {
  const t = useT();
  const q = useQuery({ queryKey: ["plan", id, crop], queryFn: () => recommendations.plan(id, crop) });
  return (
    <QueryState query={q} isEmpty={(d) => d.items.length === 0} empty={<Card>{t("plan.empty")}</Card>}>
      {(plan) => (
        <div className="space-y-8">
          {KINDS.map((kind) => {
            const items = plan.items.filter((i) => i.kind === kind);
            if (items.length === 0) return null;
            return (
              <section key={kind} aria-labelledby={`plan-${kind}`}>
                <h2 id={`plan-${kind}`} className="mb-3 text-2xl">{t(`plan.kind.${kind}`)}</h2>
                <ul className="space-y-3">
                  {items.map((i) => (
                    <li key={`${i.title}-${i.source.label}`}>
                      <Card className="space-y-2">
                        <h3 className="text-lg">{i.title}</h3>
                        <p className="text-[15px] leading-relaxed text-ink2">{i.detail}</p>
                        <p className="flex flex-wrap items-center gap-2 text-sm">
                          <Badge tone="blue">{t(`plan.sourceType.${i.source.type}`)}</Badge>
                          {i.source.url ? (
                            <a href={i.source.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 text-olive-ink underline">
                              {i.source.label}
                              <ExternalLink aria-hidden className="h-3.5 w-3.5" />
                              <span className="sr-only">{t("common.opensNewTab")}</span>
                            </a>
                          ) : (
                            <span className="text-ink2">{i.source.label}</span>
                          )}
                        </p>
                      </Card>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
          <p role="note" className="rounded-lg bg-ochre-soft px-4 py-3 text-sm text-ochre-ink">{plan.disclaimer}</p>
        </div>
      )}
    </QueryState>
  );
}

export function ActionPlanPage({ id }: { id: string }) {
  const t = useT();
  const crop = useSearchParams().get("crop");
  const rec = useRecommendation(id);
  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/crop-advice/result/${id}`} className="mb-4 inline-flex min-h-11 items-center gap-1 text-sm text-olive-ink underline">
        <ArrowLeft aria-hidden className="h-4 w-4" />{t("why.back")}
      </Link>
      <PageHeader kicker={t("plan.kicker")} title={crop ? t("plan.titleFor", { crop }) : t("plan.title")} lead={t("plan.lead")} />
      {crop ? (
        <Plan id={id} crop={crop} />
      ) : (
        <QueryState query={rec}>
          {(r) => (
            <div>
              <p className="mb-3 text-ink2">{t("plan.chooseCrop")}</p>
              <ul className="flex flex-wrap gap-3">
                {r.regional.crops.map((c) => (
                  <li key={c.crop}>
                    <Link className={buttonClass("secondary")} href={`/crop-advice/result/${id}/action-plan?crop=${encodeURIComponent(c.crop)}`}>{c.crop}</Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </QueryState>
      )}
    </div>
  );
}
