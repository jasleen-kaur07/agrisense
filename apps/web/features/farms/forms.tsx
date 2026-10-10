"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ApiError } from "@/lib/api/errors";
import type { Farm, Field } from "@/lib/api/types";
import { useT } from "@/lib/i18n/provider";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/form";
import { LocationPicker } from "@/components/location/LocationPicker";
import {
  farmSchema, fieldSchema, isSoilEmpty, recordToSoilValues, soilSchema, soilToRecord,
  type FarmValues, type FieldValues, type SoilValues,
} from "./schemas";
import type { SoilRecord } from "@/lib/api/types";

function SubmitError({ error }: { error: unknown }) {
  const t = useT();
  if (!error) return null;
  const api = error instanceof ApiError ? error : null;
  return (
    <p role="alert" className="rounded-lg bg-terracotta-soft px-3 py-2 text-sm font-medium text-terracotta-ink">
      {api?.isNetworkError ? t("errors.offlineBody") : api?.detail || api?.title || t("errors.generic")}
      {api?.traceId && <span className="mt-1 block text-xs font-normal">{t("errors.traceId")}: {api.traceId}</span>}
    </p>
  );
}

export function FarmForm({
  initial,
  defaultLocation,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: Pick<Farm, "name" | "stateKey" | "districtKey">;
  defaultLocation?: { stateKey: string; districtKey: string } | null;
  submitLabel: string;
  onSubmit: (v: FarmValues) => Promise<unknown>;
  onCancel?: () => void;
}) {
  const t = useT();
  const [err, setErr] = useState<unknown>(null);
  const { register, control, handleSubmit, formState: { errors, isSubmitting } } = useForm<FarmValues>({
    resolver: zodResolver(farmSchema(t)),
    defaultValues: {
      name: initial?.name ?? "",
      stateKey: initial?.stateKey ?? defaultLocation?.stateKey ?? "",
      districtKey: initial?.districtKey ?? defaultLocation?.districtKey ?? "",
    },
  });
  const submit = handleSubmit(async (v) => {
    setErr(null);
    try {
      await onSubmit(v);
    } catch (e) {
      setErr(e);
    }
  });
  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <TextInput label={t("farm.name")} error={errors.name?.message} {...register("name")} />
      <Controller
        control={control}
        name="stateKey"
        render={({ field: sk }) => (
          <Controller
            control={control}
            name="districtKey"
            render={({ field: dk }) => (
              <LocationPicker
                value={{ stateKey: sk.value, districtKey: dk.value }}
                onChange={(v) => {
                  sk.onChange(v.stateKey);
                  dk.onChange(v.districtKey);
                }}
                allowGps
                error={errors.districtKey?.message ?? errors.stateKey?.message}
              />
            )}
          />
        )}
      />
      <SubmitError error={err} />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? t("common.pleaseWait") : submitLabel}</Button>
        {onCancel && <Button variant="secondary" onClick={onCancel}>{t("common.cancel")}</Button>}
      </div>
    </form>
  );
}

/** Field = name + area in acres only. Soil is never asked here. */
export function FieldForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: Pick<Field, "name" | "areaAcres">;
  submitLabel: string;
  onSubmit: (v: { name: string; areaAcres: number }) => Promise<unknown>;
  onCancel?: () => void;
}) {
  const t = useT();
  const [err, setErr] = useState<unknown>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FieldValues>({
    resolver: zodResolver(fieldSchema(t)),
    defaultValues: { name: initial?.name ?? "", areaAcres: initial ? String(initial.areaAcres) : "" },
  });
  const submit = handleSubmit(async (v) => {
    setErr(null);
    try {
      await onSubmit({ name: v.name.trim(), areaAcres: Number(v.areaAcres) });
    } catch (e) {
      setErr(e);
    }
  });
  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <TextInput label={t("field.name")} error={errors.name?.message} {...register("name")} />
      <TextInput
        label={t("field.area")}
        hint={t("field.areaHint")}
        inputMode="decimal"
        error={errors.areaAcres?.message}
        {...register("areaAcres")}
      />
      <SubmitError error={err} />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? t("common.pleaseWait") : submitLabel}</Button>
        {onCancel && <Button variant="secondary" onClick={onCancel}>{t("common.cancel")}</Button>}
      </div>
    </form>
  );
}

/** Optional soil test values, clearly described as not used by the Regional Crop Guide. */
export function SoilForm({
  soil,
  onSave,
  onRemove,
}: {
  soil?: SoilRecord | null;
  onSave: (r: SoilRecord) => Promise<unknown>;
  onRemove?: () => Promise<unknown>;
}) {
  const t = useT();
  const [err, setErr] = useState<unknown>(null);
  const [saved, setSaved] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<SoilValues>({
    resolver: zodResolver(soilSchema(t)),
    defaultValues: recordToSoilValues(soil),
  });
  const submit = handleSubmit(async (v) => {
    setErr(null);
    setSaved(false);
    if (isSoilEmpty(v)) {
      setErr(new ApiError({ status: 0, title: "", detail: t("soil.empty") }));
      return;
    }
    try {
      await onSave(soilToRecord(v));
      setSaved(true);
    } catch (e) {
      setErr(e);
    }
  });
  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <p className="text-sm text-ink2">{t("soil.explain")}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput label={t("soil.nitrogen")} inputMode="decimal" error={errors.nitrogen?.message} {...register("nitrogen")} />
        <TextInput label={t("soil.phosphorus")} inputMode="decimal" error={errors.phosphorus?.message} {...register("phosphorus")} />
        <TextInput label={t("soil.potassium")} inputMode="decimal" error={errors.potassium?.message} {...register("potassium")} />
        <TextInput label={t("soil.ph")} inputMode="decimal" error={errors.ph?.message} {...register("ph")} />
        <TextInput label={t("soil.testedOn")} type="date" error={errors.testedOn?.message} {...register("testedOn")} />
      </div>
      <p className="text-xs text-muted">{t("soil.units")}</p>
      <SubmitError error={err} />
      {saved && <p role="status" className="text-sm font-medium text-olive-ink">{t("soil.saved")}</p>}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={isSubmitting}>{t("soil.save")}</Button>
        {soil && onRemove && (
          <Button variant="danger" onClick={() => void onRemove()}>{t("soil.remove")}</Button>
        )}
      </div>
    </form>
  );
}
