"use client";

import { ExternalLink } from "lucide-react";
import { useT } from "@/lib/i18n/provider";
import { Card, PageHeader } from "@/components/ui/misc";

/** Official portals only. No eligibility, amounts or scheme content is reproduced. */
const PORTALS = [
  { id: "soil", host: "soilhealth.dac.gov.in", url: "https://soilhealth.dac.gov.in/" },
  { id: "pmfby", host: "pmfby.gov.in", url: "https://pmfby.gov.in/" },
  { id: "pmkisan", host: "pmkisan.gov.in", url: "https://pmkisan.gov.in/" },
  { id: "farmer", host: "farmer.gov.in", url: "https://farmer.gov.in/" },
] as const;

export function SchemesPage() {
  const t = useT();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader kicker={t("nav.more")} title={t("schemes.title")} lead={t("schemes.lead")} />
      <ul className="space-y-3">
        {PORTALS.map((p) => (
          <li key={p.id}>
            <Card>
              <h2 className="text-xl">{t(`schemes.${p.id}.name`)}</h2>
              <p className="mt-1 text-[15px] text-ink2">{t(`schemes.${p.id}.about`)}</p>
              <a href={p.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-11 items-center gap-1.5 font-semibold text-olive-ink underline">
                {p.host}
                <ExternalLink aria-hidden className="h-4 w-4" />
                <span className="sr-only">{t("common.opensNewTab")}</span>
              </a>
            </Card>
          </li>
        ))}
      </ul>
      <p role="note" className="mt-6 rounded-lg bg-ochre-soft px-4 py-3 text-sm text-ochre-ink">{t("schemes.note")}</p>
    </div>
  );
}
