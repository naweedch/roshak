/**
 * لاگ ساخت‌یافته به‌صورت JSON در هر خط (مناسب جمع‌آوری توسط Loki/ELK/CloudWatch).
 * کلیدهای حساس به‌طور خودکار حذف می‌شوند.
 */
import "server-only";

type Level = "debug" | "info" | "warn" | "error";
const LEVELS: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const SENSITIVE_KEY = /pass(word)?|secret|token|authorization|cookie|card|pan|cvv|otp/i;

function threshold(): number {
  const configured = (process.env.LOG_LEVEL ?? "info") as Level;
  return LEVELS[configured] ?? LEVELS.info;
}

function redact(value: unknown, depth = 0): unknown {
  if (depth > 6 || value === null || typeof value !== "object") return value;
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: process.env.NODE_ENV === "production" ? undefined : value.stack,
    };
  }
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = SENSITIVE_KEY.test(k) ? "[REDACTED]" : redact(v, depth + 1);
  }
  return out;
}

export type LogFields = Record<string, unknown>;

function write(level: Level, message: string, fields?: LogFields) {
  if (LEVELS[level] < threshold()) return;
  const line = JSON.stringify({
    level,
    time: new Date().toISOString(),
    msg: message,
    ...(fields ? (redact(fields) as LogFields) : {}),
  });
  if (level === "error" || level === "warn") console.error(line);
  else console.log(line);
}

export interface Logger {
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
  child(bindings: LogFields): Logger;
}

function make(bindings: LogFields = {}): Logger {
  return {
    debug: (m, f) => write("debug", m, { ...bindings, ...f }),
    info: (m, f) => write("info", m, { ...bindings, ...f }),
    warn: (m, f) => write("warn", m, { ...bindings, ...f }),
    error: (m, f) => write("error", m, { ...bindings, ...f }),
    child: (b) => make({ ...bindings, ...b }),
  };
}

export const logger = make({ service: "roshnak" });

/**
 * قلاب گزارش خطا برای سرویس‌های پایش (Sentry و مشابه).
 * با تنظیم ERROR_WEBHOOK_URL خطاها به یک endpoint ارسال می‌شوند؛ در غیر این صورت فقط لاگ می‌شوند.
 */
export async function reportError(error: unknown, context: LogFields = {}): Promise<void> {
  logger.error("unhandled_error", { error, ...context });
  const webhook = process.env.ERROR_WEBHOOK_URL;
  if (!webhook) return;
  try {
    await fetch(webhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(redact({ error, context, time: new Date().toISOString() })),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    // گزارش خطا نباید خودش خطای جدیدی بسازد
  }
}
