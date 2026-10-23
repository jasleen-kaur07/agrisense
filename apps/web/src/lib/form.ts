import { reactive, ref, watch } from "vue";
import type { ZodType } from "zod";

/**
 * Small form helper around a Zod schema (no form library): values, per-field errors, submit state.
 * The schema is built per validation so messages follow the current language.
 * Validation runs on submit, then re-runs on every change (like react-hook-form's default).
 */
export function useForm<T extends Record<string, unknown>>(schema: () => ZodType<T>, initial: T) {
  const values = reactive({ ...initial }) as T;
  const errors = reactive<Record<string, string | undefined>>({});
  const submitting = ref(false);
  let submitted = false;

  function validate(): T | null {
    const result = schema().safeParse(values);
    for (const k of Object.keys(errors)) delete errors[k];
    if (result.success) return result.data;
    for (const issue of result.error.issues) {
      const field = String(issue.path[0] ?? "");
      if (field && errors[field] === undefined) errors[field] = issue.message;
    }
    return null;
  }

  watch(values, () => {
    if (submitted) validate();
  }, { deep: true });

  function submit(handler: (parsed: T) => Promise<void> | void) {
    return async (e?: Event) => {
      e?.preventDefault();
      submitted = true;
      const parsed = validate();
      if (!parsed) return;
      submitting.value = true;
      try {
        await handler(parsed);
      } finally {
        submitting.value = false;
      }
    };
  }

  function setError(field: string, message: string) {
    errors[field] = message;
  }

  function reset(next: Partial<T> = initial) {
    Object.assign(values, { ...initial, ...next });
    for (const k of Object.keys(errors)) delete errors[k];
    submitted = false;
  }

  return { values, errors, submitting, submit, setError, validate, reset };
}
