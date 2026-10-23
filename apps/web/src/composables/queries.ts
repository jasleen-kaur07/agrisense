import { computed } from "vue";
import { farms, fields, locations, profile, seasons } from "@/lib/api/endpoints";
import { useQuery } from "@/lib/query";

/** Cache keys shared between readers and invalidators. */
export const qk = {
  profile: ["profile"] as const,
  farms: ["farms"] as const,
  fields: ["fields"] as const,
  season: ["season"] as const,
};

export const useProfile = () => useQuery(() => qk.profile, profile.get);
export const useFarms = () => useQuery(() => qk.farms, farms.list);
export const useFields = () => useQuery(() => qk.fields, fields.list);
export const useSeason = () => useQuery(() => qk.season, seasons.current, { staleTime: 3_600_000 });

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

  const key = computed(() => {
    const sKey = prof.data?.preferredStateKey ?? null;
    const dKey = prof.data?.preferredDistrictKey ?? null;
    const firstFarm = farmQ.data?.[0];
    if (sKey && dKey) return { stateKey: sKey, districtKey: dKey };
    if (firstFarm) return { stateKey: firstFarm.stateKey, districtKey: firstFarm.districtKey };
    return null;
  });

  const names = useQuery(
    () => ["location", key.value?.stateKey, key.value?.districtKey],
    () => locations.one(key.value!.stateKey, key.value!.districtKey),
    { enabled: () => !!key.value, staleTime: 3_600_000 },
  );

  const pending = computed(() => prof.isPending || (!key.value && farmQ.isPending) || (!!key.value && names.isPending));
  const location = computed<HomeLocation | null>(() => {
    if (!key.value) return null;
    const firstFarm = farmQ.data?.[0];
    return { ...key.value, state: names.data?.state ?? firstFarm?.state, district: names.data?.district ?? firstFarm?.district };
  });
  const error = computed(() => (prof.error ?? farmQ.error ?? null) as unknown);
  return { location, pending, error };
}
