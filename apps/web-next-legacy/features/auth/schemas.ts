import { z } from "zod";

type T = (key: string) => string;

export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 128;

export const loginSchema = (t: T) =>
  z.object({
    email: z.string().min(1, t("validation.emailRequired")).pipe(z.email(t("validation.emailInvalid"))),
    password: z.string().min(1, t("validation.passwordRequired")),
  });

export const registerSchema = (t: T) =>
  z.object({
    displayName: z.string().max(80, t("validation.nameTooLong")).optional(),
    email: z.string().min(1, t("validation.emailRequired")).pipe(z.email(t("validation.emailInvalid"))),
    password: z
      .string()
      .min(PASSWORD_MIN, t("validation.passwordMin"))
      .max(PASSWORD_MAX, t("validation.passwordMax")),
  });

export const forgotSchema = (t: T) =>
  z.object({ email: z.string().min(1, t("validation.emailRequired")).pipe(z.email(t("validation.emailInvalid"))) });

export const resetSchema = (t: T) =>
  z
    .object({
      newPassword: z.string().min(PASSWORD_MIN, t("validation.passwordMin")).max(PASSWORD_MAX, t("validation.passwordMax")),
      confirm: z.string(),
    })
    .refine((v) => v.newPassword === v.confirm, { path: ["confirm"], message: t("validation.passwordMismatch") });

export type LoginValues = z.infer<ReturnType<typeof loginSchema>>;
export type RegisterValues = z.infer<ReturnType<typeof registerSchema>>;

/** Only allow same-origin relative redirects. */
export function safeNext(next: string | null | undefined, fallback: string): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
