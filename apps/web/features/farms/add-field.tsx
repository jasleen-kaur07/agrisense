"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { farms, fields } from "@/lib/api/endpoints";
import type { Farm, Field } from "@/lib/api/types";
import { useT } from "@/lib/i18n/provider";
import { qk, useFarms, useHomeLocation } from "@/lib/hooks/queries";
import { SelectInput } from "@/components/ui/form";
import { FarmForm, FieldForm } from "./forms";
import { SkeletonBlock, ErrorPanel } from "@/components/data/states";

/** Add a field to an existing farm, or create the first farm then the field. Name + acres only. */
export function AddFieldPanel({ onCreated, onCancel }: { onCreated: (f: Field) => void; onCancel?: () => void }) {
  const t = useT();
  const qc = useQueryClient();
  const farmQ = useFarms();
  const home = useHomeLocation();
  const [farmId, setFarmId] = useState<string>("");
  const [newFarm, setNewFarm] = useState(false);

  if (farmQ.isPending) return <SkeletonBlock rows={2} />;
  if (farmQ.isError) return <ErrorPanel error={farmQ.error} onRetry={() => void farmQ.refetch()} />;

  const list: Farm[] = farmQ.data;
  const showFarmForm = list.length === 0 || newFarm;
  const chosen = farmId || list[0]?.id || "";

  if (showFarmForm) {
    return (
      <div className="space-y-3">
        <h3 className="text-xl">{t("farm.addTitle")}</h3>
        <FarmForm
          defaultLocation={home.location}
          submitLabel={t("farm.create")}
          onCancel={list.length > 0 ? () => setNewFarm(false) : onCancel}
          onSubmit={async (v) => {
            const f = await farms.create(v);
            await qc.invalidateQueries({ queryKey: qk.farms });
            setFarmId(f.id);
            setNewFarm(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xl">{t("field.addTitle")}</h3>
      <SelectInput label={t("field.farm")} value={chosen} onChange={(e) => setFarmId(e.target.value)}>
        {list.map((f) => (
          <option key={f.id} value={f.id}>{f.name} · {f.district}</option>
        ))}
      </SelectInput>
      <button type="button" className="min-h-11 text-sm text-olive-ink underline" onClick={() => setNewFarm(true)}>
        {t("farm.addAnother")}
      </button>
      <FieldForm
        submitLabel={t("field.create")}
        onCancel={onCancel}
        onSubmit={async (v) => {
          const f = await fields.create(chosen, v);
          await qc.invalidateQueries({ queryKey: qk.fields });
          onCreated(f);
        }}
      />
    </div>
  );
}
