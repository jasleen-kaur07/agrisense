"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { profile } from "@/lib/api/endpoints";
import type { ExperienceLevel } from "@/lib/api/types";
import { useI18n } from "@/lib/i18n/provider";
import type { Lang } from "@/lib/i18n/core";
import { qk, useProfile } from "@/lib/hooks/queries";
import { QueryState } from "@/components/data/states";
import { Button } from "@/components/ui/button";
import { SelectInput, TextInput } from "@/components/ui/form";
import { Card } from "@/components/ui/misc";
import { LocationPicker, type LocationValue } from "@/components/location/LocationPicker";
import { ErrorPanel } from "@/components/data/states";
import type { Profile } from "@/lib/api/types";

function ProfileForm({ p }: { p: Profile }) {
  const { t, setLang } = useI18n();
  const qc = useQueryClient();
  const [name, setName] = useState(p.displayName ?? "");
  const [lang, setL] = useState<Lang>(p.language);
  const [level, setLevel] = useState<ExperienceLevel | "">(p.experienceLevel ?? "");
  const [loc, setLoc] = useState<LocationValue>({ stateKey: p.preferredStateKey ?? "", districtKey: p.preferredDistrictKey ?? "" });
  const save = useMutation({
    mutationFn: () =>
      profile.update({
        displayName: name.trim() || undefined,
        language: lang,
        ...(level ? { experienceLevel: level } : {}),
        ...(loc.stateKey && loc.districtKey ? { preferredStateKey: loc.stateKey, preferredDistrictKey: loc.districtKey } : {}),
      }),
    onSuccess: () => {
      setLang(lang);
      void qc.invalidateQueries({ queryKey: qk.profile });
      void qc.invalidateQueries({ queryKey: qk.me });
    },
  });
  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <TextInput label={t("onboarding.nameLabel")} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
      <SelectInput label={t("language.label")} value={lang} onChange={(e) => setL(e.target.value as Lang)}>
        <option value="en">English</option>
        <option value="hi">हिन्दी (Hindi)</option>
      </SelectInput>
      <SelectInput label={t("settings.experience")} value={level} onChange={(e) => setLevel(e.target.value as ExperienceLevel | "")}>
        <option value="">{t("settings.notSet")}</option>
        {(["BEGINNER", "INTERMEDIATE", "EXPERIENCED"] as const).map((l) => <option key={l} value={l}>{t(`experience.${l}`)}</option>)}
      </SelectInput>
      <div>
        <p className="mb-2 text-sm font-semibold text-ink2">{t("settings.homeLocation")}</p>
        <LocationPicker value={loc} onChange={setLoc} />
      </div>
      {save.isError && <ErrorPanel error={save.error} />}
      {save.isSuccess && <p role="status" className="text-sm font-medium text-olive-ink">{t("common.saved")}</p>}
      <Button type="submit" disabled={save.isPending}>{t("common.save")}</Button>
    </form>
  );
}

export function ProfileSection() {
  const { t } = useI18n();
  const q = useProfile();
  return (
    <Card>
      <h2 className="mb-4 text-2xl">{t("settings.profileTitle")}</h2>
      <QueryState query={q}>{(p) => <ProfileForm p={p} />}</QueryState>
    </Card>
  );
}
