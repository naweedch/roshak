/**
 * پوشش یکسان برای همهٔ Route Handlerهای ‎/api/v1‎:
 * - شناسهٔ درخواست و لاگ ساخت‌یافته
 * - احراز هویت (مشتری/کارمند) و بررسی مجوز در سرور
 * - محافظت CSRF با بررسی Origin و نوع محتوا برای درخواست‌های تغییردهنده
 * - محدودسازی نرخ
 * - اعتبارسنجی بدنه با Zod و پاسخ خطای یکسان بدون نشت جزئیات داخلی
 */
import "server-only";
import type { z } from "zod";
import { ZodError } from "zod";
import { fieldErrors } from "@/lib/validation/common";
import { hasPermission, type Permission } from "@/lib/rbac";
import { AppError, errors, isAppError, isUniqueViolation } from "../errors";
import { logger, reportError, type Logger } from "../logger";
import { rateLimit, type RateLimitRule } from "../rate-limit";
import { SESSION_POLICY, validateSession, type ValidSession } from "../auth/session";
import { writeAudit, type AuditEntry } from "../services/audit";
import { db } from "../db";
import { getClientIp, getUserAgent, parseCookies, serializeCookie, secureCookies, type CookieOptions } from "./request";

type AuthMode = "none" | "optional-customer" | "customer" | "staff";

export interface RouteConfig {
  auth?: AuthMode;
  /** مجوز لازم برای مسیرهای کارکنان */
  permission?: Permission;
  /** محدودیت نرخ بر اساس IP (و در صورت ورود، شناسهٔ کاربر) */
  rateLimit?: { name: string; rule: RateLimitRule };
  /** برای وب‌هوک‌ها که از سرور درگاه می‌آیند false است */
  csrf?: boolean;
  /** کد وضعیت پاسخ موفق (پیش‌فرض ۲۰۰) */
  status?: number;
  /** سیاست کش پاسخ موفق؛ پیش‌فرض no-store */
  cache?: "no-store" | "public-short";
  /** حداکثر حجم بدنهٔ JSON به بایت */
  maxBodyBytes?: number;
}

export interface ApiContext<P> {
  request: Request;
  params: P;
  requestId: string;
  ip: string;
  userAgent?: string;
  log: Logger;
  customer: ValidSession | null;
  staff: ValidSession | null;
  cookies: {
    get(name: string): string | undefined;
    set(name: string, value: string, options?: CookieOptions): void;
    append(raw: string): void;
  };
  /** خواندن و اعتبارسنجی بدنهٔ JSON */
  body<S extends z.ZodType>(schema: S): Promise<z.output<S>>;
  /** اعتبارسنجی پارامترهای query string */
  query<S extends z.ZodType>(schema: S): z.output<S>;
  /** محدودیت نرخ با کلید دلخواه (مثلاً به ازای هر حساب) */
  limit(key: string, rule: RateLimitRule): Promise<void>;
  /** ثبت ممیزی برای اقدام کارمند (در صورت نیاز درون تراکنش) */
  audit(entry: AuditEntry, client?: Parameters<typeof writeAudit>[0]): Promise<void>;
  /** کارمند فعلی (برای مسیرهای staff همیشه موجود است) */
  requireStaff(): ValidSession;
  requireCustomer(): ValidSession;
}

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const DEFAULT_MAX_BODY = 1024 * 1024;

function allowedOrigins(): Set<string> {
  const origins = new Set<string>();
  const appUrl = process.env.APP_URL;
  if (appUrl) origins.add(new URL(appUrl).origin);
  for (const extra of (process.env.ALLOWED_ORIGINS ?? "").split(",")) {
    if (extra.trim()) origins.add(extra.trim());
  }
  return origins;
}

function checkCsrf(request: Request): void {
  const origin = request.headers.get("origin");
  if (origin) {
    const requestOrigin = new URL(request.url).origin;
    if (origin !== requestOrigin && !allowedOrigins().has(origin)) {
      throw errors.forbidden("درخواست از مبدأ غیرمجاز رد شد");
    }
    return;
  }
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    throw errors.forbidden("درخواست از مبدأ غیرمجاز رد شد");
  }
}

function errorResponse(error: AppError, requestId: string, extraHeaders?: Headers): Response {
  const headers = new Headers(extraHeaders);
  headers.set("cache-control", "no-store");
  headers.set("x-request-id", requestId);
  if (error.code === "RATE_LIMITED" && typeof error.details?.retryAfterSeconds === "number") {
    headers.set("retry-after", String(error.details.retryAfterSeconds));
  }
  return Response.json(
    { error: { code: error.code, message: error.message, details: error.details, requestId } },
    { status: error.status, headers },
  );
}

type RouteHandler<P> = (request: Request, context: { params: Promise<P> }) => Promise<Response>;

export function route<P extends Record<string, string | string[]> = Record<string, never>>(
  config: RouteConfig,
  handler: (ctx: ApiContext<P>) => Promise<unknown>,
): RouteHandler<P> {
  return async (request, context) => {
    const requestId = request.headers.get("x-request-id")?.slice(0, 64) || crypto.randomUUID();
    const ip = getClientIp(request.headers);
    const userAgent = getUserAgent(request.headers);
    const url = new URL(request.url);
    const log = logger.child({ requestId, method: request.method, path: url.pathname });
    const responseHeaders = new Headers();
    const started = performance.now();

    try {
      const isUnsafe = UNSAFE_METHODS.has(request.method);
      if (isUnsafe && config.csrf !== false) {
        checkCsrf(request);
        const contentType = request.headers.get("content-type") ?? "";
        const hasBody = request.headers.get("content-length") !== "0" && request.method !== "DELETE";
        if (hasBody && contentType && !contentType.startsWith("application/json") && !contentType.startsWith("multipart/form-data")) {
          throw errors.unsupportedMedia("نوع محتوای درخواست پشتیبانی نمی‌شود");
        }
      }

      const cookieMap = parseCookies(request.headers.get("cookie"));
      const auth = config.auth ?? "none";
      let customer: ValidSession | null = null;
      let staff: ValidSession | null = null;

      if (auth === "customer" || auth === "optional-customer") {
        customer = await validateSession(cookieMap.get(SESSION_POLICY.CUSTOMER.cookie), "CUSTOMER");
        if (auth === "customer" && !customer) throw errors.unauthorized();
      }
      if (auth === "staff") {
        staff = await validateSession(cookieMap.get(SESSION_POLICY.STAFF.cookie), "STAFF");
        if (!staff) throw errors.unauthorized("نشست مدیریت معتبر نیست؛ دوباره وارد شوید");
        if (config.permission && !hasPermission(staff.user.role, config.permission)) {
          log.warn("authz_denied", { userId: staff.user.id, role: staff.user.role, permission: config.permission });
          throw errors.forbidden();
        }
      }

      if (config.rateLimit) {
        const principal = staff?.user.id ?? customer?.user.id ?? ip;
        const result = await rateLimit(`${config.rateLimit.name}:${principal}`, config.rateLimit.rule);
        if (!result.allowed) throw errors.rateLimited(result.retryAfterSeconds);
      }

      const params = (await context.params) ?? ({} as P);

      const ctx: ApiContext<P> = {
        request,
        params,
        requestId,
        ip,
        userAgent,
        log,
        customer,
        staff,
        cookies: {
          get: (name) => cookieMap.get(name),
          set: (name, value, options) =>
            responseHeaders.append("set-cookie", serializeCookie(name, value, { secure: secureCookies(), ...options })),
          append: (raw) => responseHeaders.append("set-cookie", raw),
        },
        async body(schema) {
          const declared = Number(request.headers.get("content-length") ?? 0);
          const max = config.maxBodyBytes ?? DEFAULT_MAX_BODY;
          if (declared > max) throw errors.payloadTooLarge("حجم درخواست بیش از حد مجاز است");
          const raw = await request.text();
          if (raw.length > max) throw errors.payloadTooLarge("حجم درخواست بیش از حد مجاز است");
          let json: unknown;
          try {
            json = raw.length ? JSON.parse(raw) : {};
          } catch {
            throw errors.badRequest("بدنهٔ درخواست JSON معتبر نیست");
          }
          const parsed = schema.safeParse(json);
          if (!parsed.success) throw errors.validation(fieldErrors(parsed.error));
          return parsed.data;
        },
        query(schema) {
          const obj: Record<string, string | string[]> = {};
          for (const key of new Set(url.searchParams.keys())) {
            const all = url.searchParams.getAll(key);
            obj[key] = all.length > 1 ? all : all[0];
          }
          const parsed = schema.safeParse(obj);
          if (!parsed.success) throw errors.validation(fieldErrors(parsed.error), "پارامترهای درخواست معتبر نیست");
          return parsed.data;
        },
        async limit(key, rule) {
          const result = await rateLimit(key, rule);
          if (!result.allowed) throw errors.rateLimited(result.retryAfterSeconds);
        },
        async audit(entry, client) {
          const actor = staff?.user;
          if (!actor) throw new Error("audit بدون کارمند فراخوانی شد");
          await writeAudit(client ?? db, { id: actor.id, email: actor.email }, { ...entry, ipAddress: ip, userAgent });
        },
        requireStaff() {
          if (!staff) throw errors.unauthorized();
          return staff;
        },
        requireCustomer() {
          if (!customer) throw errors.unauthorized();
          return customer;
        },
      };

      const result = await handler(ctx);
      const duration = Math.round(performance.now() - started);
      log.info("api_request", { status: config.status ?? 200, durationMs: duration, userId: staff?.user.id ?? customer?.user.id });

      if (result instanceof Response) {
        // سربرگ‌های Response.redirect() و برخی پاسخ‌ها تغییرناپذیرند؛ پاسخ با سربرگ‌های ادغام‌شده بازسازی می‌شود
        const headers = new Headers(result.headers);
        responseHeaders.forEach((value, key) => headers.append(key, value));
        headers.set("x-request-id", requestId);
        return new Response(result.body, { status: result.status, statusText: result.statusText, headers });
      }

      responseHeaders.set("x-request-id", requestId);
      responseHeaders.set(
        "cache-control",
        config.cache === "public-short" && !customer && !staff ? "public, max-age=0, s-maxage=60, stale-while-revalidate=300" : "no-store",
      );
      return Response.json({ data: result ?? null }, { status: config.status ?? 200, headers: responseHeaders });
    } catch (error) {
      if (isAppError(error)) {
        if (error.status >= 500) await reportError(error, { requestId });
        else log.info("api_client_error", { code: error.code, status: error.status });
        return errorResponse(error, requestId, responseHeaders);
      }
      if (error instanceof ZodError) {
        return errorResponse(errors.validation(fieldErrors(error)), requestId, responseHeaders);
      }
      if (isUniqueViolation(error)) {
        return errorResponse(errors.conflict("این مقدار قبلاً ثبت شده است"), requestId, responseHeaders);
      }
      await reportError(error, { requestId, path: url.pathname });
      return errorResponse(new AppError("INTERNAL_ERROR", "خطای غیرمنتظره‌ای رخ داد؛ لطفاً دوباره تلاش کنید"), requestId, responseHeaders);
    }
  };
}
