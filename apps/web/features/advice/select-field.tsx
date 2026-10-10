"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus } from "lucide-react";
import type { Season } from "@/lib/api/types";
import { useI18n } from "@/lib/i18n/provider";
import { useFarms, useFields, useSeason } from "@/lib/hooks/queries";
import { Button } from "@/components/ui/button";
import { SelectInput } from "@/components/ui/form";
import { Card, Kicker, PageHeader } from "@/components/ui/misc";
import { EmptyState, QueryState } from "@/components/data/states";
import { AddFieldPanel } from "@/features/farms/add-field";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/cn";

const SEASONS: Season[] = ["KHARIF", "RABI", "SUMMER"];

export function SelectField() {
  const { t, lang } = useI18n();
  const router = useRouter();
  const fieldsQ = useFields();
  const farmsQ = useFarms();
  const seasonQ = useSeason();
  const [picked, setPicked] = useState<string | null>(null);
  const [seasonPick, setSeasonPick] = useState<Season | null>(null);
  const [adding, setAdding] = useState(false);

  const season: Season | undefined = seasonPick ?? seasonQ.data?.season;

  return (
    <div>
      <PageHeader kicker={t("advice.kicker")} title={t("advice.title")} lead={t("advice.lead")} />
      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <section aria-labelledby="pick-field">
            <h2 id="pick-field" className="mb-3 text-2xl">{t("advice.chooseField")}</h2>
            <QueryState
              query={fieldsQ}
              isEmpty={(d) => d.length === 0}
              empty={
                <div className="space-y-4">
                  <EmptyState title={t("advice.noFields")} body={t("advice.noFieldsBody")} />
                  <Card><AddFieldPanel onCreated={(f) => { setPicked(f.id); }} /></Card>
                </div>
              }
            >
              {(list) => {
                const selected = picked ?? (list.length === 1 ? list[0].id : null);
                return (
                  <div className="space-y-3">
                    <fieldset className="space-y-3">
                      <legend className="sr-only">{t("advice.chooseField")}</legend>
                      {list.map((f) => {
                        const farm = farmsQ.data?.find((x) => x.id === f.farmId);
                        return (
                          <label
                            key={f.id}
                            className={cn(
                              "flex min-h-14 cursor-pointer items-start gap-3 rounded-lg border bg-surface p-4 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-olive-ink",
                              selected === f.id ? "border-forest ring-1 ring-forest" : "border-line-dark",
                            )}
                          >
                            <input type="radio" name="field" className="mt-1 h-4 w-4 accent-[#19342d]" checked={selected === f.id} onChange={() => setPicked(f.id)} />
                            <span>
                              <span className="block font-semibold text-ink">{f.name}</span>
                              <span className="block text-sm text-ink2">
                                {[farm ? `${farm.district}, ${farm.state}` : f.farmName, `${formatNumber(f.areaAcres, lang, 2)} ${t("field.acres")}`].filter(Boolean).join(" · ")}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </fieldset>
                    {adding ? (
                      <Card>
                        <AddFieldPanel onCreated={(f) => { setPicked(f.id); setAdding(false); }} onCancel={() => setAdding(false)} />
                      </Card>
                    ) : (
                      <Button variant="secondary" onClick={() => setAdding(true)}><Plus aria-hidden className="h-4 w-4" />{t("advice.addField")}</Button>
                    )}

                    <div className="border-t border-line pt-6">
                      <h2 className="mb-3 text-2xl">{t("advice.season")}</h2>
                      <SelectInput
                        label={t("advice.seasonLabel")}
                        hint={seasonQ.data ? t("advice.seasonHint") : undefined}
                        value={season ?? ""}
                        disabled={seasonQ.isPending && !seasonPick}
                        onChange={(e) => setSeasonPick(e.target.value as Season)}
                      >
                        {!season && <option value="">{t("common.loading")}</option>}
                        {SEASONS.map((s) => (
                          <option key={s} value={s}>{t(`season.${s}`)}{seasonQ.data?.season === s ? ` (${t("season.current")})` : ""}</option>
                        ))}
                      </SelectInput>
                    </div>

                    <Button
                      disabled={!selected || !season}
                      onClick={() => router.push(`/crop-advice/analyse?fieldId=${selected}&season=${season}`)}
                    >
                      {t("advice.start")}
                    </Button>
                  </div>
                );
              }}
            </QueryState>
          </section>
        </div>

        <aside aria-labelledby="uses-h">
          <Card className="bg-sage2">
            <Kicker className="mb-2">{t("advice.usesKicker")}</Kicker>
            <h2 id="uses-h" className="mb-3 text-2xl">{t("advice.usesTitle")}</h2>
            <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-ink2">
              <li>{t("advice.uses1")}</li>
              <li>{t("advice.uses2")}</li>
              <li>{t("advice.uses3")}</li>
            </ul>
            <p className="mt-4 border-t border-line-dark pt-4 text-sm leading-relaxed text-ink2">{t("advice.notUsed")}</p>
          </Card>
        </aside>
      </div>
    </div>
  );
}
