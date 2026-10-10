"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { auth, farms, fields, locations, profile, seasons } from "@/lib/api/endpoints";

export const qk = {
  me: ["me"] as const,
  profile: ["profile"] as const,
  farms: ["farms"] as const,
  fields: ["fields"] as const,
  season: ["season"] as const,
};

export const useMe = () => useQuery({ queryKey: qk.me, queryFn: () => auth.me(), staleTime: 60_000 });
export const useProfile = () => useQuery({ queryKey: qk.profile, queryFn: profile.get });
export const useFarms = () => useQuery({ queryKey: qk.farms, queryFn: farms.list });
export const useFields = () => useQuery({ queryKey: qk.fields, queryFn: fields.list });
export const useSeason = () => useQuery({ queryKey: qk.season, queryFn: seasons.current, staleTime: 3_600_000 });

export interface HomeLocation {
  stateKey: string;
  districtKey: string;
  state?: string;
  district?: string;
}

/** The user's working location: profile preference, else the first farm. Pure selection of API data. */
export function useHomeLocation() {
  const prof = useProfile();
  const farmQ = useFarms();
  const sKey = prof.data?.preferredStateKey ?? null;
  const dKey = prof.data?.preferredDistrictKey ?? null;
  const firstFarm = farmQ.data?.[0];
  const key = sKey && dKey ? { stateKey: sKey, districtKey: dKey } : firstFarm ? { stateKey: firstFarm.stateKey, districtKey: firstFarm.districtKey } : null;
  const names = useQuery({
    queryKey: ["location", key?.stateKey, key?.districtKey],
    queryFn: () => locations.one(key!.stateKey, key!.districtKey),
    enabled: !!key,
    staleTime: 3_600_000,
  });
  const pending = prof.isPending || (!key && farmQ.isPending) || (!!key && names.isPending);
  const location: HomeLocation | null = key
    ? { ...key, state: names.data?.state ?? firstFarm?.state, district: names.data?.district ?? firstFarm?.district }
    : null;
  return { location, pending, error: prof.error ?? farmQ.error ?? null };
}

export function useOnline(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}
