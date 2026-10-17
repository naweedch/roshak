/** ابزارهای خواندن اطلاعات درخواست (IP، کوکی، User-Agent) بدون وابستگی به next/headers */
import "server-only";

/** خواندن کوکی‌ها از هدر Cookie */
export function parseCookies(header: string | null): Map<string, string> {
  const map = new Map<string, string>();
  if (!header) return map;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    const name = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (!name) continue;
    try {
      map.set(name, decodeURIComponent(value));
    } catch {
      map.set(name, value);
    }
  }
  return map;
}

export function getCookie(request: Request, name: string): string | undefined {
  return parseCookies(request.headers.get("cookie")).get(name);
}

/**
 * IP کلاینت. پشت پروکسی معکوس (nginx/CDN) با TRUSTED_PROXY_HOPS تعداد پروکسی‌های مورد اعتماد مشخص می‌شود
 * و آدرس از سمت راست X-Forwarded-For خوانده می‌شود تا قابل جعل نباشد.
 */
export function getClientIp(headers: Headers): string {
  const hops = Number(process.env.TRUSTED_PROXY_HOPS ?? 0);
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded && hops > 0) {
    const chain = forwarded
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const candidate = chain[Math.max(0, chain.length - hops)];
    if (candidate) return candidate;
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}

export function getUserAgent(headers: Headers): string | undefined {
  const ua = headers.get("user-agent");
  return ua ? ua.slice(0, 300) : undefined;
}

export interface CookieOptions {
  maxAge?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "lax" | "strict" | "none";
  path?: string;
}

export function serializeCookie(name: string, value: string, options: CookieOptions = {}): string {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  parts.push(`Path=${options.path ?? "/"}`);
  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${Math.floor(options.maxAge)}`);
    if (options.maxAge <= 0) parts.push("Expires=Thu, 01 Jan 1970 00:00:00 GMT");
  }
  if (options.httpOnly !== false) parts.push("HttpOnly");
  if (options.secure) parts.push("Secure");
  const sameSite = options.sameSite ?? "lax";
  parts.push(`SameSite=${sameSite.charAt(0).toUpperCase()}${sameSite.slice(1)}`);
  return parts.join("; ");
}

/** کوکی‌ها در محیط عملیاتی (HTTPS) با Secure ارسال می‌شوند */
export function secureCookies(): boolean {
  return (process.env.APP_URL ?? "").startsWith("https://");
}
