"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { farms, fields, profile } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";
import type { ExperienceLevel } from "@/lib/api/types";
import { useI18n } from "@/lib/i18n/provider";
import type { Lang } from "@/lib/i18n/core";
import { qk, useMe } from "@/lib/hooks/queries";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/form";
import { Card, PageHeader } from "@/components/ui/misc";
import { Steps } from "@/components/ui/steps";
import { LocationPicker, type LocationValue } from "@/components/location/LocationPicker";
import { FieldForm } from "@/features/farms/forms";
import { cn } from "@/lib/cn";

function RadioCards<T extends string>({
  legend,
  value,
  options,
  onChange,
}: {
  legend: string;
  value: T | null;
  options: { value: T; label: string; hint?: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="mb-2 text-sm font-semibold text-ink2">{legend}</legend>
      {options.map((o) => (
        <label
          key={o.value}
          className={cn(
            "flex min-h-14 cursor-pointer items-start gap-3 rounded-lg border bg-surface p-4 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-olive-ink",
            value === o.value ? "border-forest ring-1 ring-forest" : "border-line-dark",
          )}
        >
          <input type="radio" name={legend} className="mt-1 h-4 w-4 accent-[#19342d]" checked={value === o.value} onChange={() => onChange(o.value)} />
          <span>
            <span className="block font-semibold text-ink">{o.label}</span>
            {o.hint && <span className="block text-sm text-ink2">{o.hint}</span>}
          </span>
        </label>
      ))}
    </fieldset>
  );
}

export function OnboardingWizard() {
  const { t, lang, setLang } = useI18n();
  const router = useRouter();
  const qc = useQueryClient();
  const me = useMe();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [level, setLevel] = useState<ExperienceLevel | null>(null);
  const [loc, setLoc] = useState<LocationValue>({ stateKey: "", districtKey: "" });
  const [farmName, setFarmName] = useState(t("onboarding.defaultFarmName"));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [locError, setLocError] = useState<string | undefined>();

  useEffect(() => {
    if (me.data?.onboardingCompleted) router.replace("/overview");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    else if (me.data?.displayName) setName((n) => n || me.data!.displayName!);
  }, [me.data, router]);

  const labels = [t("onboarding.stepProfile"), t("onboarding.stepExperience"), t("onboarding.stepLocation"), t("onboarding.stepField")];

  const run = async (fn: () => Promise<void>, onOk: () => void) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      onOk();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    await profile.update({ onboardingCompleted: true });
    await qc.invalidateQueries({ queryKey: qk.me });
    await qc.invalidateQueries({ queryKey: qk.profile });
    router.replace("/overview");
  };

  const errBox = error ? (
    <p role="alert" className="rounded-lg bg-terracotta-soft px-3 py-2 text-sm font-medium text-terracotta-ink">
      {error instanceof ApiError ? (error.isNetworkError ? t("errors.offlineBody") : error.detail || error.title) : t("errors.generic")}
      {error instanceof ApiError && error.traceId && <span className="mt-1 block text-xs font-normal">{t("errors.traceId")}: {error.traceId}</span>}
    </p>
  ) : null;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader kicker={t("onboarding.kicker")} title={t("onboarding.title")} lead={t("onboarding.lead")} />
      <div className="mb-6">
        <Steps label={t("onboarding.progress")} labels={labels} current={step} />
        <p className="sr-only" aria-live="polite">{t("onboarding.stepOf", { n: step + 1, total: 4 })}</p>
      </div>
      <Card className="space-y-6">
        {step === 0 && (
          <>
            <h2 className="text-2xl">{t("onboarding.profileTitle")}</h2>
            <TextInput label={t("onboarding.nameLabel")} hint={t("common.optional")} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={80} />
            <RadioCards<Lang>
              legend={t("language.label")}
              value={lang}
              onChange={(l) => setLang(l)}
              options={[
                { value: "en", label: "English" },
                { value: "hi", label: "हिन्दी (Hindi)" },
              ]}
            />
            {errBox}
            <Button
              disabled={busy}
              onClick={() =>
                void run(
                  async () => void (await profile.update({ language: lang, ...(name.trim() ? { displayName: name.trim() } : {}) })),
                  () => setStep(1),
                )
              }
            >
              {t("common.continue")}
            </Button>
          </>
        )}

        {step === 1 && (
          <>
            <h2 className="text-2xl">{t("onboarding.experienceTitle")}</h2>
            <RadioCards<ExperienceLevel>
              legend={t("onboarding.experienceLegend")}
              value={level}
              onChange={setLevel}
              options={[
                { value: "BEGINNER", label: t("experience.BEGINNER"), hint: t("experience.BEGINNERHint") },
                { value: "INTERMEDIATE", label: t("experience.INTERMEDIATE"), hint: t("experience.INTERMEDIATEHint") },
                { value: "EXPERIENCED", label: t("experience.EXPERIENCED"), hint: t("experience.EXPERIENCEDHint") },
              ]}
            />
            {errBox}
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={() => setStep(0)}>{t("common.back")}</Button>
              <Button
                disabled={busy || !level}
                onClick={() => void run(async () => void (await profile.update({ experienceLevel: level! })), () => setStep(2))}
              >
                {t("common.continue")}
              </Button>
              <Button variant="ghost" onClick={() => setStep(2)}>{t("common.skip")}</Button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="text-2xl">{t("onboarding.locationTitle")}</h2>
            <p className="text-sm text-ink2">{t("onboarding.locationLead")}</p>
            <LocationPicker allowGps value={loc} onChange={(v) => { setLoc(v); setLocError(undefined); }} error={locError} />
            {errBox}
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={() => setStep(1)}>{t("common.back")}</Button>
              <Button
                disabled={busy}
                onClick={() => {
                  if (!loc.stateKey || !loc.districtKey) {
                    setLocError(t("validation.districtRequired"));
                    return;
                  }
                  void run(
                    async () => void (await profile.update({ preferredStateKey: loc.stateKey, preferredDistrictKey: loc.districtKey })),
                    () => setStep(3),
                  );
                }}
              >
                {t("common.continue")}
              </Button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="text-2xl">{t("onboarding.fieldTitle")}</h2>
            <p className="text-sm text-ink2">{t("onboarding.fieldLead")}</p>
            <TextInput label={t("farm.name")} value={farmName} onChange={(e) => setFarmName(e.target.value)} maxLength={80} />
            {errBox}
            <FieldForm
              submitLabel={t("onboarding.finish")}
              onSubmit={async (v) => {
                if (!farmName.trim()) throw new ApiError({ status: 0, title: "", detail: t("validation.nameRequired") });
                setError(null);
                const farm = await farms.create({ name: farmName.trim(), stateKey: loc.stateKey, districtKey: loc.districtKey });
                await fields.create(farm.id, v);
                await qc.invalidateQueries({ queryKey: qk.farms });
                await qc.invalidateQueries({ queryKey: qk.fields });
                await finish();
              }}
              onCancel={() => setStep(2)}
            />
            <div className="border-t border-line pt-4">
              <Button variant="ghost" disabled={busy} onClick={() => void run(finish, () => {})}>{t("onboarding.skipField")}</Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
