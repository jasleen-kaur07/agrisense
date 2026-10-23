"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm, type FieldValues, type Path, type UseFormSetError } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { auth } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";
import { useI18n } from "@/lib/i18n/provider";
import { qk } from "@/lib/hooks/queries";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/form";
import { Card, PageHeader } from "@/components/ui/misc";
import {
  forgotSchema, loginSchema, registerSchema, resetSchema, safeNext,
  type LoginValues, type RegisterValues,
} from "./schemas";

function applyFieldErrors<T extends FieldValues>(err: unknown, setError: UseFormSetError<T>) {
  if (err instanceof ApiError) {
    for (const [field, message] of Object.entries(err.fieldMessages)) setError(field as Path<T>, { message });
  }
}

function FormError({ message, traceId }: { message: string | null; traceId?: string }) {
  const { t } = useI18n();
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg bg-terracotta-soft px-3 py-2 text-sm font-medium text-terracotta-ink">
      {message}
      {traceId && (
        <span className="mt-1 block text-xs font-normal">
          {t("errors.traceId")}: {traceId}
        </span>
      )}
    </p>
  );
}

export function LoginForm() {
  const { t } = useI18n();
  const router = useRouter();
  const qc = useQueryClient();
  const params = useSearchParams();
  const next = params.get("next");
  const [formError, setFormError] = useState<{ message: string; traceId?: string } | null>(null);
  const [probing, setProbing] = useState(!!next);
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema(t)),
  });

  // Arrived from the route guard: one silent session resume (refresh happens inside apiFetch) before showing the form.
  useEffect(() => {
    if (!next) return;
    let cancelled = false;
    auth
      .me(true)
      .then((u) => {
        if (cancelled) return;
        qc.setQueryData(qk.me, u);
        router.replace(safeNext(next, "/overview"));
      })
      .catch(() => {
        if (!cancelled) setProbing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [next, qc, router]);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const user = await auth.login(values);
      qc.clear();
      qc.setQueryData(qk.me, user);
      router.replace(user.onboardingCompleted ? safeNext(next, "/overview") : "/onboarding");
    } catch (e) {
      const api = e instanceof ApiError ? e : null;
      if (api?.status === 401) setFormError({ message: t("auth.invalidCredentials") });
      else if (api?.status === 429) setFormError({ message: t("auth.tooManyAttempts") });
      else setFormError({ message: api?.isNetworkError ? t("errors.offlineBody") : t("errors.generic"), traceId: api?.traceId });
      applyFieldErrors(e, setError);
    }
  });

  if (probing) return <p role="status" className="text-center text-ink2">{t("auth.resuming")}</p>;

  return (
    <Card>
      <PageHeader title={t("auth.loginTitle")} />
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <TextInput label={t("auth.email")} type="email" autoComplete="email" inputMode="email" error={errors.email?.message} {...register("email")} />
        <TextInput label={t("auth.password")} type="password" autoComplete="current-password" error={errors.password?.message} {...register("password")} />
        <FormError message={formError?.message ?? null} traceId={formError?.traceId} />
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? t("common.pleaseWait") : t("auth.login")}
        </Button>
      </form>
      <div className="mt-5 flex flex-col gap-1 text-sm">
        <Link className="inline-flex min-h-11 items-center text-olive-ink underline" href="/forgot-password">{t("auth.forgotLink")}</Link>
        <Link className="inline-flex min-h-11 items-center text-olive-ink underline" href="/register">{t("auth.noAccount")}</Link>
      </div>
    </Card>
  );
}

export function RegisterForm() {
  const { t, lang } = useI18n();
  const router = useRouter();
  const qc = useQueryClient();
  const [formError, setFormError] = useState<{ message: string; traceId?: string } | null>(null);
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema(t)),
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const user = await auth.register({
        email: values.email,
        password: values.password,
        displayName: values.displayName?.trim() || undefined,
        language: lang,
      });
      qc.clear();
      qc.setQueryData(qk.me, user);
      router.replace(user.onboardingCompleted ? "/overview" : "/onboarding");
    } catch (e) {
      const api = e instanceof ApiError ? e : null;
      if (api?.status === 409) setFormError({ message: t("auth.emailTaken") });
      else if (api?.status === 429) setFormError({ message: t("auth.tooManyAttempts") });
      else setFormError({ message: api?.isNetworkError ? t("errors.offlineBody") : api?.detail || t("errors.generic"), traceId: api?.traceId });
      applyFieldErrors(e, setError);
    }
  });

  return (
    <Card>
      <PageHeader title={t("auth.registerTitle")} lead={t("auth.registerLead")} />
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <TextInput label={t("auth.displayName")} hint={t("common.optional")} autoComplete="name" error={errors.displayName?.message} {...register("displayName")} />
        <TextInput label={t("auth.email")} type="email" autoComplete="email" inputMode="email" error={errors.email?.message} {...register("email")} />
        <TextInput label={t("auth.password")} type="password" autoComplete="new-password" hint={t("auth.passwordHint")} error={errors.password?.message} {...register("password")} />
        <FormError message={formError?.message ?? null} traceId={formError?.traceId} />
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? t("common.pleaseWait") : t("auth.createAccount")}
        </Button>
      </form>
      <Link className="mt-5 inline-flex min-h-11 items-center text-sm text-olive-ink underline" href="/login">{t("auth.haveAccount")}</Link>
    </Card>
  );
}

export function ForgotForm() {
  const { t } = useI18n();
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<{ email: string }>({
    resolver: zodResolver(forgotSchema(t)),
  });
  const onSubmit = handleSubmit(async ({ email }) => {
    setFormError(null);
    try {
      await auth.forgot(email);
      setSent(true);
    } catch (e) {
      setFormError(e instanceof ApiError && e.status === 429 ? t("auth.tooManyAttempts") : t("errors.generic"));
    }
  });
  return (
    <Card>
      <PageHeader title={t("auth.forgotTitle")} lead={t("auth.forgotLead")} />
      {sent ? (
        <p role="status" className="rounded-lg bg-sage px-3 py-3 text-sm text-olive-ink">{t("auth.forgotSent")}</p>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-5">
          <TextInput label={t("auth.email")} type="email" autoComplete="email" error={errors.email?.message} {...register("email")} />
          <FormError message={formError} />
          <Button type="submit" className="w-full" disabled={isSubmitting}>{t("auth.sendLink")}</Button>
        </form>
      )}
      <Link className="mt-5 inline-flex min-h-11 items-center text-sm text-olive-ink underline" href="/login">{t("auth.backToLogin")}</Link>
    </Card>
  );
}

export function ResetForm() {
  const { t } = useI18n();
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<{ newPassword: string; confirm: string }>({
    resolver: zodResolver(resetSchema(t)),
  });
  const onSubmit = handleSubmit(async ({ newPassword }) => {
    setFormError(null);
    try {
      await auth.reset(token, newPassword);
      setDone(true);
      setTimeout(() => router.replace("/login"), 1500);
    } catch (e) {
      setFormError(e instanceof ApiError && e.status === 400 ? t("auth.resetInvalid") : t("errors.generic"));
    }
  });
  if (!token) return <Card><p role="alert" className="text-terracotta-ink">{t("auth.resetMissingToken")}</p></Card>;
  return (
    <Card>
      <PageHeader title={t("auth.resetTitle")} />
      {done ? (
        <p role="status" className="rounded-lg bg-sage px-3 py-3 text-sm text-olive-ink">{t("auth.resetDone")}</p>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-5">
          <TextInput label={t("auth.newPassword")} type="password" autoComplete="new-password" hint={t("auth.passwordHint")} error={errors.newPassword?.message} {...register("newPassword")} />
          <TextInput label={t("auth.confirmPassword")} type="password" autoComplete="new-password" error={errors.confirm?.message} {...register("confirm")} />
          <FormError message={formError} />
          <Button type="submit" className="w-full" disabled={isSubmitting}>{t("auth.setPassword")}</Button>
        </form>
      )}
    </Card>
  );
}
