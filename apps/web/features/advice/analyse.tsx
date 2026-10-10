"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { recommendations } from "@/lib/api/endpoints";
import type { Season } from "@/lib/api/types";
import { useT } from "@/lib/i18n/provider";
import { ErrorPanel } from "@/components/data/states";
import { LinkButton } from "@/components/ui/button";
import { Card, PageHeader } from "@/components/ui/misc";
import { TaskList } from "@/components/ui/steps";

const SEASONS = ["KHARIF", "RABI", "SUMMER"];

/** Real POST /recommendations; the list reflects the request state, there is no artificial delay. */
export function Analyse() {
  const t = useT();
  const router = useRouter();
  const qc = useQueryClient();
  const params = useSearchParams();
  const fieldId = params.get("fieldId");
  const seasonParam = params.get("season");
  const season = seasonParam && SEASONS.includes(seasonParam) ? (seasonParam as Season) : undefined;
  const started = useRef(false);
  const [attempt, setAttempt] = useState(0);
  const keyRef = useRef<string>("");

  const create = useMutation({
    mutationFn: () => recommendations.create({ fieldId: fieldId!, season, mode: "REGIONAL" }, keyRef.current),
    onSuccess: (rec) => {
      qc.setQueryData(["recommendation", rec.id], rec);
      void qc.invalidateQueries({ queryKey: ["recommendations"] });
      router.replace(`/crop-advice/result/${rec.id}`);
    },
  });

  useEffect(() => {
    if (!fieldId || started.current) return;
    started.current = true;
    keyRef.current = crypto.randomUUID();
    create.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldId, attempt]);

  if (!fieldId) {
    return (
      <Card role="alert">
        <p className="mb-3">{t("analyse.missingField")}</p>
        <LinkButton href="/crop-advice">{t("analyse.back")}</LinkButton>
      </Card>
    );
  }

  const status = create.isError ? "error" : create.isSuccess ? "done" : "pending";
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader kicker={t("advice.kicker")} title={t("analyse.title")} lead={t("analyse.lead")} />
      <Card className="space-y-6" aria-live="polite" aria-busy={status === "pending"}>
        <TaskList
          items={[
            { label: t("analyse.stepLocation"), status },
            { label: t("analyse.stepRecords"), status },
            { label: t("analyse.stepWeather"), status },
          ]}
        />
        {create.isError && (
          <>
            <ErrorPanel
              error={create.error}
              onRetry={() => {
                started.current = false;
                create.reset();
                setAttempt((a) => a + 1);
              }}
            />
            <LinkButton href="/crop-advice" variant="secondary">{t("analyse.back")}</LinkButton>
          </>
        )}
      </Card>
    </div>
  );
}
