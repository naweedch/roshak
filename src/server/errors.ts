/**
 * خطاهای دامنه با پیام فارسیِ امن برای نمایش به کاربر.
 * هر خطای دیگری (پیش‌بینی‌نشده) با پیام عمومی و بدون جزئیات داخلی پاسخ داده می‌شود.
 */
export type ErrorCode =
  | "BAD_REQUEST"
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "OUT_OF_STOCK"
  | "PAYMENT_ERROR"
  | "UNSUPPORTED_MEDIA"
  | "PAYLOAD_TOO_LARGE"
  | "SERVICE_UNAVAILABLE"
  | "INTERNAL_ERROR";

const STATUS: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  VALIDATION_ERROR: 422,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  OUT_OF_STOCK: 409,
  PAYMENT_ERROR: 402,
  UNSUPPORTED_MEDIA: 415,
  PAYLOAD_TOO_LARGE: 413,
  SERVICE_UNAVAILABLE: 503,
  INTERNAL_ERROR: 500,
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(code: ErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = STATUS[code];
    this.details = details;
  }
}

export const errors = {
  badRequest: (message = "درخواست نامعتبر است", details?: Record<string, unknown>) =>
    new AppError("BAD_REQUEST", message, details),
  validation: (fields: Record<string, string>, message = "اطلاعات واردشده معتبر نیست") =>
    new AppError("VALIDATION_ERROR", message, { fields }),
  unauthorized: (message = "برای ادامه وارد حساب کاربری شوید") => new AppError("UNAUTHORIZED", message),
  forbidden: (message = "شما به این بخش دسترسی ندارید") => new AppError("FORBIDDEN", message),
  notFound: (message = "مورد درخواستی یافت نشد") => new AppError("NOT_FOUND", message),
  conflict: (message: string, details?: Record<string, unknown>) => new AppError("CONFLICT", message, details),
  rateLimited: (retryAfterSeconds: number) =>
    new AppError("RATE_LIMITED", "تعداد درخواست‌ها بیش از حد مجاز است؛ کمی بعد دوباره تلاش کنید", { retryAfterSeconds }),
  outOfStock: (message = "موجودی این کالا کافی نیست", details?: Record<string, unknown>) =>
    new AppError("OUT_OF_STOCK", message, details),
  payment: (message: string) => new AppError("PAYMENT_ERROR", message),
  unsupportedMedia: (message = "نوع فایل پشتیبانی نمی‌شود") => new AppError("UNSUPPORTED_MEDIA", message),
  payloadTooLarge: (message = "حجم فایل بیش از حد مجاز است") => new AppError("PAYLOAD_TOO_LARGE", message),
  unavailable: (message = "این سرویس در حال حاضر در دسترس نیست") => new AppError("SERVICE_UNAVAILABLE", message),
};

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/** تشخیص خطای نقض یکتایی Prisma (P2002) */
export function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002";
}

/** تشخیص خطای «رکورد یافت نشد» Prisma (P2025) */
export function isRecordNotFound(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2025";
}
