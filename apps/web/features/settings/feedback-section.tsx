"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { feedback } from "@/lib/api/endpoints";
import type { FeedbackCategory } from "@/lib/api/types";
import { useT } from "@/lib/i18n/provider";
import { ErrorPanel } from "@/components/data/states";
import { Button } from "@/components/ui/button";
import { SelectInput, TextArea } from "@/components/ui/form";
import { Card } from "@/components/ui/misc";

const CATS: FeedbackCategory[] = ["BUG", "IDEA", "DATA_ISSUE", "OTHER"];

export const feedbackSchema = (t: (k: string) => string) =>
  z.object({
    category: z.enum(["BUG", "IDEA", "DATA_ISSUE", "OTHER"]),
    message: z.string().trim().min(5, t("validation.feedbackMin")).max(2000, t("validation.feedbackMax")),
    rating: z.string(),
  });
type Values = z.infer<ReturnType<typeof feedbackSchema>>;

export function FeedbackSection() {
  const t = useT();
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<unknown>(null);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(feedbackSchema(t)),
    defaultValues: { category: "IDEA", message: "", rating: "" },
  });
  const onSubmit = handleSubmit(async (v) => {
    setErr(null);
    setSent(false);
    try {
      await feedback.send({ category: v.category, message: v.message.trim(), ...(v.rating ? { rating: Number(v.rating) } : {}) });
      setSent(true);
      reset();
    } catch (e) {
      setErr(e);
    }
  });
  return (
    <Card>
      <h2 className="text-2xl">{t("settings.feedbackTitle")}</h2>
      <p className="mb-4 mt-1 text-sm text-ink2">{t("settings.feedbackLead")}</p>
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <SelectInput label={t("feedback.category")} {...register("category")}>
          {CATS.map((c) => <option key={c} value={c}>{t(`feedback.cat.${c}`)}</option>)}
        </SelectInput>
        <TextArea label={t("feedback.message")} error={errors.message?.message} {...register("message")} />
        <SelectInput label={t("feedback.rating")} {...register("rating")}>
          <option value="">{t("settings.notSet")}</option>
          {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
        </SelectInput>
        {!!err && <ErrorPanel error={err} />}
        {sent && <p role="status" className="text-sm font-medium text-olive-ink">{t("feedback.thanks")}</p>}
        <Button type="submit" disabled={isSubmitting}>{t("feedback.send")}</Button>
      </form>
    </Card>
  );
}
