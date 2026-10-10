"use client";

import { useT } from "@/lib/i18n/provider";
import { LinkButton } from "@/components/ui/button";
import { Badge, Card, PageHeader } from "@/components/ui/misc";

/** Honest "not available yet" page; deliberately shows no numbers or placeholder values. */
export function NotAvailable({ topic }: { topic: "prediction" | "fertilizer" | "market" }) {
  const t = useT();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader kicker={t("nav.insights")} title={t(`nav.${topic}`)} actions={<Badge tone="ochre">{t("notAvailable.badge")}</Badge>} />
      <Card className="space-y-4">
        <h2 className="text-2xl">{t("notAvailable.title")}</h2>
        <p className="leading-relaxed text-ink2">{t(`notAvailable.${topic}Why`)}</p>
        <p className="leading-relaxed text-ink2">{t(`notAvailable.${topic}Meanwhile`)}</p>
        <div className="flex flex-wrap gap-3 pt-2">
          <LinkButton href="/crop-advice">{t("notAvailable.toGuide")}</LinkButton>
          <LinkButton href="/more/schemes" variant="secondary">{t("nav.schemes")}</LinkButton>
        </div>
      </Card>
    </div>
  );
}
