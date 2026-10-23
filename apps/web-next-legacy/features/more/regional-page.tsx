"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { regional } from "@/lib/api/endpoints";
import type { Season } from "@/lib/api/types";
import { useT } from "@/lib/i18n/provider";
import { useHomeLocation, useSeason } from "@/lib/hooks/queries";
import { QueryState } from "@/components/data/states";
import { SelectInput } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/misc";
import { LocationPicker, type LocationValue } from "@/components/location/LocationPicker";
import { RegionalGuide } from "@/components/advice/RegionalGuide";

const SEASONS: Season[] = ["KHARIF", "RABI", "SUMMER"];

export function RegionalPage() {
  const t = useT();
  const { location } = useHomeLocation();
  const seasonQ = useSeason();
  const [loc, setLoc] = useState<LocationValue | null>(null);
  const [seasonPick, setSeasonPick] = useState<Season | null>(null);

  const eff: LocationValue = loc ?? (location ? { stateKey: location.stateKey, districtKey: location.districtKey } : { stateKey: "", districtKey: "" });
  const season = seasonPick ?? seasonQ.data?.season;
  const ready = !!eff.stateKey && !!eff.districtKey && !!season;

  const q = useQuery({
    queryKey: ["guide", eff.stateKey, eff.districtKey, season],
    queryFn: () => regional.guide(eff.stateKey, eff.districtKey, season!),
    enabled: ready,
  });

  return (
    <div>
      <PageHeader kicker={t("nav.more")} title={t("regional.title")} lead={t("regional.lead")} />
      <div className="mb-8 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <LocationPicker value={eff} onChange={setLoc} />
        <SelectInput label={t("advice.seasonLabel")} value={season ?? ""} onChange={(e) => setSeasonPick(e.target.value as Season)}>
          {!season && <option value="">{t("common.loading")}</option>}
          {SEASONS.map((s) => <option key={s} value={s}>{t(`season.${s}`)}</option>)}
        </SelectInput>
      </div>
      {!ready ? (
        <p className="text-ink2">{t("regional.pickPrompt")}</p>
      ) : (
        <QueryState query={q}>{(g) => <RegionalGuide guide={g} />}</QueryState>
      )}
    </div>
  );
}
