/**
 * فراخوانی API از کامپوننت‌های کلاینت با قالب پاسخ یکسان { data } / { error }.
 */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly fields: Record<string, string>;
  readonly details?: Record<string, unknown>;

  constructor(status: number, code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    this.fields = (details?.fields as Record<string, string>) ?? {};
  }
}

export async function api<T>(path: string, init: { method?: string; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: init.method ?? (init.body !== undefined ? "POST" : "GET"),
      headers: init.body !== undefined ? { "content-type": "application/json" } : undefined,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      credentials: "same-origin",
      cache: "no-store",
      signal: init.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(0, "NETWORK_ERROR", "ارتباط با سرور برقرار نشد؛ اتصال اینترنت را بررسی کنید");
  }
  const json = (await response.json().catch(() => null)) as { data?: T; error?: { code: string; message: string; details?: Record<string, unknown> } } | null;
  if (!response.ok || !json || json.error) {
    throw new ApiError(
      response.status,
      json?.error?.code ?? "UNKNOWN",
      json?.error?.message ?? "خطای غیرمنتظره‌ای رخ داد؛ لطفاً دوباره تلاش کنید",
      json?.error?.details,
    );
  }
  return json.data as T;
}
