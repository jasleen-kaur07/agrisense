"use client";

import { useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LocateFixed, Search } from "lucide-react";
import { locations } from "@/lib/api/endpoints";
import type { District } from "@/lib/api/types";
import { useI18n } from "@/lib/i18n/provider";
import { SelectInput, TextInput } from "@/components/ui/form";
import { ErrorPanel } from "@/components/data/states";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/errors";
import { formatNumber } from "@/lib/format";

export interface LocationValue {
  stateKey: string;
  districtKey: string;
}

/** State/district picker over the supported-district gazetteer, plus name search. No GPS. */
export function LocationPicker({
  value,
  onChange,
  error,
  allowGps = false,
}: {
  value: LocationValue;
  onChange: (v: LocationValue) => void;
  error?: string;
  allowGps?: boolean;
}) {
  const { t, lang } = useI18n();
  const [gps, setGps] = useState<{ state: "idle" | "busy" | "ok" | "msg"; text?: string }>({ state: "idle" });
  const [q, setQ] = useState("");
  const listId = useId();
  const states = useQuery({ queryKey: ["states"], queryFn: locations.states, staleTime: 3_600_000 });
  const districts = useQuery({
    queryKey: ["districts", value.stateKey],
    queryFn: () => locations.districts(value.stateKey),
    enabled: !!value.stateKey,
    staleTime: 3_600_000,
  });
  const term = q.trim();
  const search = useQuery({
    queryKey: ["location-search", term],
    queryFn: () => locations.search(term),
    enabled: term.length >= 2,
    staleTime: 60_000,
  });

  // Explicit click only. Coordinates are sent once to the server and never stored here.
  const findMyLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGps({ state: "msg", text: t("location.gpsUnsupported") });
      return;
    }
    setGps({ state: "busy" });
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const d = await locations.nearest(pos.coords.latitude, pos.coords.longitude);
          onChange({ stateKey: d.stateKey, districtKey: d.districtKey });
          setGps({
            state: "ok",
            text: t("location.gpsFound", {
              district: d.district,
              state: d.state,
              km: d.distanceKm !== undefined ? formatNumber(d.distanceKm, lang) : "?",
            }),
          });
        } catch (e) {
          setGps({ state: "msg", text: e instanceof ApiError && e.status === 404 ? t("location.gpsNoneNearby") : t("location.gpsFailed") });
        }
      },
      (err) =>
        setGps({ state: "msg", text: err.code === err.PERMISSION_DENIED ? t("location.gpsDenied") : t("location.gpsTimeout") }),
      { timeout: 10000, maximumAge: 0 },
    );
  };

  const pick = (d: District) => {
    onChange({ stateKey: d.stateKey, districtKey: d.districtKey });
    setQ("");
  };

  if (states.isError) return <ErrorPanel error={states.error} onRetry={() => void states.refetch()} />;

  return (
    <div className="space-y-4">
      {allowGps && (
        <div>
          <Button variant="secondary" onClick={findMyLocation} disabled={gps.state === "busy"}>
            <LocateFixed aria-hidden className="h-4 w-4" />
            {gps.state === "busy" ? t("location.gpsBusy") : t("location.useMine")}
          </Button>
          <p className="mt-1 text-sm text-ink2">{t("location.gpsPrivacy")}</p>
          <p role="status" className="mt-1 text-sm text-ink2" data-testid="gps-status">{gps.text}</p>
        </div>
      )}
      <div className="relative">
        <TextInput
          label={t("location.search")}
          placeholder={t("location.searchHint")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoComplete="off"
          aria-controls={term.length >= 2 ? listId : undefined}
        />
        <Search aria-hidden className="pointer-events-none absolute right-3 top-9 h-4 w-4 text-muted" />
        {term.length >= 2 && (
          <div id={listId} className="mt-2" aria-live="polite">
            {search.isPending && <p className="text-sm text-muted">{t("common.loading")}</p>}
            {search.isError && <p className="text-sm text-terracotta-ink">{t("errors.generic")}</p>}
            {search.data && search.data.length === 0 && <p className="text-sm text-muted">{t("location.noResults")}</p>}
            {search.data && search.data.length > 0 && (
              <ul className="divide-y divide-line rounded-lg border border-line-dark bg-surface">
                {search.data.map((d) => (
                  <li key={`${d.stateKey}/${d.districtKey}`}>
                    <button type="button" onClick={() => pick(d)} className="flex min-h-11 w-full items-center px-3 text-left text-sm hover:bg-sage2">
                      {d.district}, {d.state}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectInput
          label={t("location.state")}
          value={value.stateKey}
          disabled={states.isPending}
          onChange={(e) => onChange({ stateKey: e.target.value, districtKey: "" })}
        >
          <option value="">{states.isPending ? t("common.loading") : t("location.chooseState")}</option>
          {states.data?.map((s) => (
            <option key={s.stateKey} value={s.stateKey}>{s.name}</option>
          ))}
        </SelectInput>
        <SelectInput
          label={t("location.district")}
          value={value.districtKey}
          disabled={!value.stateKey || districts.isPending}
          error={error}
          onChange={(e) => onChange({ stateKey: value.stateKey, districtKey: e.target.value })}
        >
          <option value="">{districts.isPending && value.stateKey ? t("common.loading") : t("location.chooseDistrict")}</option>
          {districts.data?.map((d) => (
            <option key={d.districtKey} value={d.districtKey}>{d.district}</option>
          ))}
        </SelectInput>
      </div>
    </div>
  );
}
