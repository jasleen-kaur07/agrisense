export interface FieldError {
  field: string;
  message: string;
}

/** RFC 7807 problem+json error as returned by the gateway. status 0 = network failure. */
export class ApiError extends Error {
  readonly status: number;
  readonly title: string;
  readonly detail?: string;
  readonly traceId?: string;
  readonly type?: string;
  readonly fieldErrors: FieldError[];

  constructor(init: {
    status: number;
    title: string;
    detail?: string;
    traceId?: string;
    type?: string;
    fieldErrors?: FieldError[];
  }) {
    super(init.detail || init.title);
    this.name = "ApiError";
    this.status = init.status;
    this.title = init.title;
    this.detail = init.detail;
    this.traceId = init.traceId;
    this.type = init.type;
    this.fieldErrors = init.fieldErrors ?? [];
  }

  get isNetworkError(): boolean {
    return this.status === 0;
  }

  /** Map of field name to first message, for form error display. */
  get fieldMessages(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const e of this.fieldErrors) if (!(e.field in out)) out[e.field] = e.message;
    return out;
  }
}

export async function parseProblem(res: Response): Promise<ApiError> {
  let body: Record<string, unknown> | null;
  try {
    const text = await res.text();
    body = text ? (JSON.parse(text) as Record<string, unknown>) : null;
  } catch {
    body = null;
  }
  const errors = Array.isArray(body?.errors)
    ? (body!.errors as unknown[])
        .filter((e): e is Record<string, unknown> => typeof e === "object" && e !== null)
        .map((e) => ({ field: String(e.field ?? ""), message: String(e.message ?? "") }))
    : [];
  return new ApiError({
    status: res.status,
    title: typeof body?.title === "string" ? body.title : res.statusText || "Request failed",
    detail: typeof body?.detail === "string" ? body.detail : undefined,
    traceId:
      typeof body?.traceId === "string" ? body.traceId : (res.headers.get("x-request-id") ?? undefined),
    type: typeof body?.type === "string" ? body.type : undefined,
    fieldErrors: errors,
  });
}
