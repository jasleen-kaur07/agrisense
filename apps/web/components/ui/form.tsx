import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const control =
  "min-h-11 w-full rounded-lg border border-line-dark bg-surface px-3 text-[16px] text-ink placeholder:text-muted disabled:bg-surface2 aria-[invalid=true]:border-terracotta-ink";

export function FormField({
  label,
  hint,
  error,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  error?: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-ink2">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={`${htmlFor}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${htmlFor}-err`} role="alert" className="text-sm font-medium text-terracotta-ink">
          {error}
        </p>
      )}
    </div>
  );
}

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string };

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { label, hint, error, className, id, ...props },
  ref,
) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <FormField label={label} hint={hint} error={error} htmlFor={fid}>
      <input
        ref={ref}
        id={fid}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fid}-err` : hint ? `${fid}-hint` : undefined}
        className={cn(control, className)}
        {...props}
      />
    </FormField>
  );
});

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { label: string; hint?: string; error?: string };

export const SelectInput = forwardRef<HTMLSelectElement, SelectProps>(function SelectInput(
  { label, hint, error, className, id, children, ...props },
  ref,
) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <FormField label={label} hint={hint} error={error} htmlFor={fid}>
      <select
        ref={ref}
        id={fid}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fid}-err` : hint ? `${fid}-hint` : undefined}
        className={cn(control, className)}
        {...props}
      >
        {children}
      </select>
    </FormField>
  );
});

type AreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string; error?: string };

export const TextArea = forwardRef<HTMLTextAreaElement, AreaProps>(function TextArea(
  { label, hint, error, className, id, ...props },
  ref,
) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <FormField label={label} hint={hint} error={error} htmlFor={fid}>
      <textarea
        ref={ref}
        id={fid}
        rows={4}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fid}-err` : hint ? `${fid}-hint` : undefined}
        className={cn(control, "py-2", className)}
        {...props}
      />
    </FormField>
  );
});
