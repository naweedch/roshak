/** تست امضای وب‌هوک، هش توکن و ابزارهای درخواست */
import { describe, expect, it } from "vitest";
import { generateToken, hashToken, safeEqual } from "@/server/auth/tokens";
import { getClientIp, parseCookies, serializeCookie } from "@/server/http/request";
import { signWebhook, verifyWebhookSignature, WEBHOOK_TOLERANCE_SECONDS } from "@/server/payments/webhook";
import { safeInternalPath } from "@/lib/utils";

const SECRET = "whsec_unit_test";

describe("امضای وب‌هوک", () => {
  const body = JSON.stringify({ reference: "test_abc", status: "SUCCEEDED" });

  it("امضای معتبر پذیرفته می‌شود", () => {
    const now = 1_800_000_000;
    const { timestamp, signature } = signWebhook(SECRET, body, now);
    expect(verifyWebhookSignature(SECRET, body, timestamp, signature, now)).toEqual({ ok: true });
  });

  it("بدنهٔ دست‌کاری‌شده یا کلید اشتباه رد می‌شود", () => {
    const now = 1_800_000_000;
    const { timestamp, signature } = signWebhook(SECRET, body, now);
    expect(verifyWebhookSignature(SECRET, body.replace("SUCCEEDED", "FAILED"), timestamp, signature, now)).toEqual({ ok: false, reason: "invalid" });
    expect(verifyWebhookSignature("other", body, timestamp, signature, now)).toEqual({ ok: false, reason: "invalid" });
  });

  it("پیام قدیمی (بازپخش) رد می‌شود", () => {
    const now = 1_800_000_000;
    const { timestamp, signature } = signWebhook(SECRET, body, now - WEBHOOK_TOLERANCE_SECONDS - 1);
    expect(verifyWebhookSignature(SECRET, body, timestamp, signature, now)).toEqual({ ok: false, reason: "stale" });
  });

  it("نبود هدرها رد می‌شود", () => {
    expect(verifyWebhookSignature(SECRET, body, null, "x")).toEqual({ ok: false, reason: "missing" });
  });
});

describe("توکن‌ها", () => {
  it("توکن تصادفی و هش قطعی آن", () => {
    const a = generateToken();
    const b = generateToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(40);
    expect(hashToken(a)).toBe(hashToken(a));
    expect(hashToken(a)).not.toBe(a);
  });

  it("مقایسهٔ زمان‌ثابت", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });
});

describe("ابزارهای درخواست", () => {
  it("IP از X-Forwarded-For فقط با پروکسی مورد اعتماد خوانده می‌شود", () => {
    const headers = new Headers({ "x-forwarded-for": "6.6.6.6, 10.0.0.1", "x-real-ip": "10.0.0.2" });
    const before = process.env.TRUSTED_PROXY_HOPS;
    process.env.TRUSTED_PROXY_HOPS = "0";
    expect(getClientIp(headers)).toBe("10.0.0.2");
    process.env.TRUSTED_PROXY_HOPS = "1";
    expect(getClientIp(headers)).toBe("10.0.0.1");
    process.env.TRUSTED_PROXY_HOPS = before;
  });

  it("کوکی پیش‌فرض HttpOnly و SameSite=Lax است", () => {
    const c = serializeCookie("rsk_session", "a b", { maxAge: 60 });
    expect(c).toContain("rsk_session=a%20b");
    expect(c).toContain("HttpOnly");
    expect(c).toContain("SameSite=Lax");
    expect(parseCookies("a=1; b=%20x").get("b")).toBe(" x");
  });

  it("مسیر بازگشت فقط داخلی پذیرفته می‌شود (جلوگیری از open redirect)", () => {
    expect(safeInternalPath("/account/orders")).toBe("/account/orders");
    expect(safeInternalPath("//evil.example")).not.toBe("//evil.example");
    expect(safeInternalPath("https://evil.example")).not.toBe("https://evil.example");
  });
});
