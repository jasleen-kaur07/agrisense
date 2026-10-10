"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { farms as farmsApi, fields as fieldsApi } from "@/lib/api/endpoints";
import type { Farm, Field } from "@/lib/api/types";
import { useI18n } from "@/lib/i18n/provider";
import { formatNumber } from "@/lib/format";
import { qk, useFarms, useFields } from "@/lib/hooks/queries";
import { EmptyState, ErrorPanel, SkeletonBlock } from "@/components/data/states";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/misc";
import { FarmForm, FieldForm, SoilForm } from "@/features/farms/forms";

function FieldRow({ field }: { field: Field }) {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const [mode, setMode] = useState<"view" | "edit" | "soil">("view");
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: qk.fields });
  };
  const del = useMutation({ mutationFn: () => fieldsApi.remove(field.id), onSuccess: refresh });

  return (
    <li className="border-t border-line py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-ink">{field.name}</p>
          <p className="text-sm text-ink2">
            {formatNumber(field.areaAcres, lang, 2)} {t("field.acres")}
            {field.soil && <Badge tone="olive" className="ml-2">{t("soil.stored")}</Badge>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" aria-expanded={mode === "edit"} onClick={() => setMode(mode === "edit" ? "view" : "edit")}>{t("common.edit")}</Button>
          <Button variant="secondary" aria-expanded={mode === "soil"} onClick={() => setMode(mode === "soil" ? "view" : "soil")}>{t("soil.section")}</Button>
          <Button
            variant="danger"
            disabled={del.isPending}
            aria-label={t("field.deleteAria", { name: field.name })}
            onClick={() => { if (window.confirm(t("field.confirmDelete"))) del.mutate(); }}
          >
            {t("common.delete")}
          </Button>
        </div>
      </div>
      {del.isError && <div className="mt-3"><ErrorPanel error={del.error} /></div>}
      {mode === "edit" && (
        <div className="mt-4 rounded-lg bg-sage2 p-4">
          <FieldForm
            initial={field}
            submitLabel={t("common.save")}
            onCancel={() => setMode("view")}
            onSubmit={async (v) => {
              await fieldsApi.update(field.id, { ...v, ...(field.soil ? { soil: field.soil } : {}) });
              refresh();
              setMode("view");
            }}
          />
        </div>
      )}
      {mode === "soil" && (
        <div className="mt-4 rounded-lg bg-sage2 p-4">
          <h3 className="mb-2 text-xl">{t("soil.section")}</h3>
          <SoilForm
            soil={field.soil}
            onSave={async (r) => {
              await fieldsApi.saveSoil(field.id, r);
              refresh();
            }}
            onRemove={async () => {
              await fieldsApi.removeSoil(field.id);
              refresh();
              setMode("view");
            }}
          />
        </div>
      )}
    </li>
  );
}

function FarmCard({ farm, fields }: { farm: Farm; fields: Field[] }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [mode, setMode] = useState<"view" | "edit" | "addField">("view");
  const del = useMutation({
    mutationFn: () => farmsApi.remove(farm.id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.farms });
      void qc.invalidateQueries({ queryKey: qk.fields });
    },
  });
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-xl">{farm.name}</h3>
          <p className="text-sm text-ink2">{farm.district}, {farm.state}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" aria-expanded={mode === "edit"} onClick={() => setMode(mode === "edit" ? "view" : "edit")}>{t("common.edit")}</Button>
          <Button
            variant="danger"
            disabled={del.isPending}
            aria-label={t("farm.deleteAria", { name: farm.name })}
            onClick={() => { if (window.confirm(t("farm.confirmDelete"))) del.mutate(); }}
          >
            {t("common.delete")}
          </Button>
        </div>
      </div>
      {del.isError && <div className="mt-3"><ErrorPanel error={del.error} /></div>}
      {mode === "edit" && (
        <div className="mt-4 rounded-lg bg-sage2 p-4">
          <FarmForm
            initial={farm}
            submitLabel={t("common.save")}
            onCancel={() => setMode("view")}
            onSubmit={async (v) => {
              await farmsApi.update(farm.id, v);
              await qc.invalidateQueries({ queryKey: qk.farms });
              setMode("view");
            }}
          />
        </div>
      )}
      <ul className="mt-4">
        {fields.length === 0 && <li className="border-t border-line pt-4 text-sm text-ink2">{t("settings.noFieldsInFarm")}</li>}
        {fields.map((f) => <FieldRow key={f.id} field={f} />)}
      </ul>
      {mode === "addField" ? (
        <div className="mt-2 rounded-lg bg-sage2 p-4">
          <h4 className="mb-3 text-lg">{t("field.addTitle")}</h4>
          <FieldForm
            submitLabel={t("field.create")}
            onCancel={() => setMode("view")}
            onSubmit={async (v) => {
              await fieldsApi.create(farm.id, v);
              await qc.invalidateQueries({ queryKey: qk.fields });
              setMode("view");
            }}
          />
        </div>
      ) : (
        <Button variant="secondary" className="mt-2" onClick={() => setMode("addField")}>{t("field.addTitle")}</Button>
      )}
    </Card>
  );
}

export function FarmsSection() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const farmsQ = useFarms();
  const fieldsQ = useFields();
  const [adding, setAdding] = useState(false);

  return (
    <section aria-labelledby="farms-h" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="farms-h" className="text-2xl">{t("settings.farmsTitle")}</h2>
          <p className="text-sm text-ink2">{t("settings.farmsLead")}</p>
        </div>
        <Button variant="secondary" onClick={() => setAdding((a) => !a)} aria-expanded={adding}>{t("farm.addTitle")}</Button>
      </div>
      {adding && (
        <Card>
          <FarmForm
            submitLabel={t("farm.create")}
            onCancel={() => setAdding(false)}
            onSubmit={async (v) => {
              await farmsApi.create(v);
              await qc.invalidateQueries({ queryKey: qk.farms });
              setAdding(false);
            }}
          />
        </Card>
      )}
      {farmsQ.isPending || fieldsQ.isPending ? (
        <SkeletonBlock />
      ) : farmsQ.isError ? (
        <ErrorPanel error={farmsQ.error} onRetry={() => void farmsQ.refetch()} />
      ) : fieldsQ.isError ? (
        <ErrorPanel error={fieldsQ.error} onRetry={() => void fieldsQ.refetch()} />
      ) : farmsQ.data.length === 0 ? (
        <EmptyState title={t("settings.noFarms")} body={t("settings.noFarmsBody")} />
      ) : (
        <div className="space-y-4">
          {farmsQ.data.map((f) => <FarmCard key={f.id} farm={f} fields={fieldsQ.data.filter((x) => x.farmId === f.id)} />)}
        </div>
      )}
    </section>
  );
}
