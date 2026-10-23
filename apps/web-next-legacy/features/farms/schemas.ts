import { z } from "zod";
import type { SoilRecord } from "@/lib/api/types";

type T = (key: string) => string;

export const farmSchema = (t: T) =>
  z.object({
    name: z.string().trim().min(1, t("validation.nameRequired")).max(80, t("validation.nameTooLong")),
    stateKey: z.string().min(1, t("validation.districtRequired")),
    districtKey: z.string().min(1, t("validation.districtRequired")),
  });
export type FarmValues = z.infer<ReturnType<typeof farmSchema>>;

export const fieldSchema = (t: T) =>
  z.object({
    name: z.string().trim().min(1, t("validation.nameRequired")).max(80, t("validation.nameTooLong")),
    areaAcres: z
      .string()
      .trim()
      .min(1, t("validation.areaRequired"))
      .refine((v) => Number.isFinite(Number(v)) && Number(v) > 0, t("validation.areaPositive"))
      .refine((v) => Number(v) <= 100000, t("validation.areaMax")),
  });
export type FieldValues = z.infer<ReturnType<typeof fieldSchema>>;

const optNum = (t: T, min: number, max?: number, msg = "validation.soilNumber") =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || (Number.isFinite(Number(v)) && Number(v) >= min && (max === undefined || Number(v) <= max)), t(msg));

export const soilSchema = (t: T) =>
  z.object({
    nitrogen: optNum(t, 0),
    phosphorus: optNum(t, 0),
    potassium: optNum(t, 0),
    ph: optNum(t, 3, 10, "validation.soilPh"),
    testedOn: z.string().trim(),
  });
export type SoilValues = z.infer<ReturnType<typeof soilSchema>>;

const num = (v: string): number | null => (v.trim() === "" ? null : Number(v));

export function soilToRecord(v: SoilValues): SoilRecord {
  return {
    nitrogen: num(v.nitrogen),
    phosphorus: num(v.phosphorus),
    potassium: num(v.potassium),
    ph: num(v.ph),
    testedOn: v.testedOn.trim() === "" ? null : v.testedOn,
  };
}

export function recordToSoilValues(s?: SoilRecord | null): SoilValues {
  const str = (n: number | null | undefined) => (n === null || n === undefined ? "" : String(n));
  return { nitrogen: str(s?.nitrogen), phosphorus: str(s?.phosphorus), potassium: str(s?.potassium), ph: str(s?.ph), testedOn: s?.testedOn ?? "" };
}

export const isSoilEmpty = (v: SoilValues) => Object.values(v).every((x) => x.trim() === "");
