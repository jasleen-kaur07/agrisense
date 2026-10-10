"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { weather as weatherApi } from "@/lib/api/endpoints";
import { useT } from "@/lib/i18n/provider";
import { useFarms, useHomeLocation } from "@/lib/hooks/queries";
import { ErrorPanel, QueryState, SkeletonBlock } from "@/components/data/states";
import { SelectInput } from "@/components/ui/form";
import { LinkButton } from "@/components/ui/button";
import { Card, PageHeader } from "@/components/ui/misc";
import { WeatherPanel } from "@/components/weather/WeatherPanel";

export function WeatherPage() {
  const t = useT();
  const { location, pending, error } = useHomeLocation();
  const farmsQ = useFarms();
  const [pick, setPick] = useState<string>("");

  const options = new Map<string, { stateKey: string; districtKey: string; label: string }>();
  if (location) options.set(`${location.stateKey}|${location.districtKey}`, { ...location, label: `${location.district ?? location.districtKey}, ${location.state ?? location.stateKey}` });
  for (const f of farmsQ.data ?? []) {
    const k = `${f.stateKey}|${f.districtKey}`;
    if (!options.has(k)) options.set(k, { stateKey: f.stateKey, districtKey: f.districtKey, label: `${f.district}, ${f.state}` });
  }
  const current = options.get(pick) ?? (location ? options.get(`${location.stateKey}|${location.districtKey}`) : undefined);

  const q = useQuery({
    queryKey: ["weather", current?.stateKey, current?.districtKey],
    queryFn: () => weatherApi.get(current!.stateKey, current!.districtKey),
    enabled: !!current,
  });

  return (
    <div>
      <PageHeader kicker={t("nav.insights")} title={t("weather.pageTitle")} lead={t("weather.pageLead")} />
      {pending ? (
        <SkeletonBlock />
      ) : error ? (
        <ErrorPanel error={error} />
      ) : !current ? (
        <Card>
          <p className="mb-4 text-ink2">{t("weather.noLocation")}</p>
          <LinkButton href="/more/settings" variant="secondary">{t("overview.openSettings")}</LinkButton>
        </Card>
      ) : (
        <div className="space-y-5">
          {options.size > 1 && (
            <div className="max-w-sm">
              <SelectInput label={t("weather.place")} value={pick || `${current.stateKey}|${current.districtKey}`} onChange={(e) => setPick(e.target.value)}>
                {[...options.entries()].map(([k, o]) => <option key={k} value={k}>{o.label}</option>)}
              </SelectInput>
            </div>
          )}
          <QueryState query={q}>{(w) => <WeatherPanel weather={w} variant="full" place={current.label} />}</QueryState>
        </div>
      )}
    </div>
  );
}
