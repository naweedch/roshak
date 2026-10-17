/**
 * محدودسازی نرخ درخواست با پنجرهٔ ثابت.
 * اگر REDIS_URL تنظیم شده باشد از Redis (مشترک بین چند نمونهٔ سرور) استفاده می‌شود،
 * وگرنه از حافظهٔ همان فرایند (مناسب استقرار تک‌نمونه‌ای و توسعه).
 */
import "server-only";
import { logger } from "./logger";

export interface RateLimitRule {
  /** حداکثر تعداد مجاز در پنجره */
  limit: number;
  /** طول پنجره به ثانیه */
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

interface Store {
  hit(key: string, windowSeconds: number): Promise<{ count: number; ttlSeconds: number }>;
  reset(key: string): Promise<void>;
}

class MemoryStore implements Store {
  private buckets = new Map<string, { count: number; resetAt: number }>();
  private lastSweep = Date.now();

  async hit(key: string, windowSeconds: number) {
    const now = Date.now();
    this.sweep(now);
    const bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      const fresh = { count: 1, resetAt: now + windowSeconds * 1000 };
      this.buckets.set(key, fresh);
      return { count: 1, ttlSeconds: windowSeconds };
    }
    bucket.count += 1;
    return { count: bucket.count, ttlSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  async reset(key: string) {
    this.buckets.delete(key);
  }

  private sweep(now: number) {
    if (now - this.lastSweep < 60_000) return;
    this.lastSweep = now;
    for (const [k, v] of this.buckets) if (v.resetAt <= now) this.buckets.delete(k);
  }
}

class RedisStore implements Store {
  constructor(private readonly client: import("ioredis").Redis) {}

  async hit(key: string, windowSeconds: number) {
    const redisKey = `rl:${key}`;
    const results = await this.client.multi().incr(redisKey).ttl(redisKey).exec();
    const count = Number(results?.[0]?.[1] ?? 1);
    let ttl = Number(results?.[1]?.[1] ?? -1);
    if (ttl < 0) {
      await this.client.expire(redisKey, windowSeconds);
      ttl = windowSeconds;
    }
    return { count, ttlSeconds: ttl };
  }

  async reset(key: string) {
    await this.client.del(`rl:${key}`);
  }
}

const globalStore = globalThis as unknown as { __roshnakRateLimitStore?: Store };
let storePromise: Promise<Store> | null = null;

async function getStore(): Promise<Store> {
  if (globalStore.__roshnakRateLimitStore) return globalStore.__roshnakRateLimitStore;
  if (!storePromise) {
    storePromise = (async () => {
      const url = process.env.REDIS_URL;
      let store: Store = new MemoryStore();
      if (url) {
        try {
          const { Redis } = await import("ioredis");
          const client = new Redis(url, { maxRetriesPerRequest: 2, enableOfflineQueue: false, lazyConnect: false });
          client.on("error", (error) => logger.warn("redis_error", { error }));
          store = new RedisStore(client);
        } catch (error) {
          logger.warn("redis_unavailable_fallback_memory", { error });
        }
      }
      globalStore.__roshnakRateLimitStore = store;
      return store;
    })();
  }
  return storePromise;
}

export async function rateLimit(key: string, rule: RateLimitRule): Promise<RateLimitResult> {
  try {
    const store = await getStore();
    const { count, ttlSeconds } = await store.hit(key, rule.windowSeconds);
    const allowed = count <= rule.limit;
    return { allowed, remaining: Math.max(0, rule.limit - count), retryAfterSeconds: allowed ? 0 : Math.max(1, ttlSeconds) };
  } catch (error) {
    // خرابی ذخیره‌ساز نباید کل سایت را از کار بیندازد؛ اما ثبت می‌شود
    logger.error("rate_limit_store_failure", { error });
    return { allowed: true, remaining: rule.limit, retryAfterSeconds: 0 };
  }
}

export async function resetRateLimit(key: string): Promise<void> {
  const store = await getStore();
  await store.reset(key);
}

/** قواعد آماده برای مسیرهای حساس */
export const RATE_LIMITS = {
  loginPerIp: { limit: 20, windowSeconds: 15 * 60 },
  loginPerAccount: { limit: 8, windowSeconds: 15 * 60 },
  register: { limit: 5, windowSeconds: 60 * 60 },
  passwordReset: { limit: 5, windowSeconds: 60 * 60 },
  emailVerification: { limit: 5, windowSeconds: 60 * 60 },
  checkout: { limit: 15, windowSeconds: 10 * 60 },
  discountCheck: { limit: 20, windowSeconds: 10 * 60 },
  cartWrite: { limit: 120, windowSeconds: 60 },
  review: { limit: 5, windowSeconds: 60 * 60 },
  newsletter: { limit: 5, windowSeconds: 60 * 60 },
  contact: { limit: 5, windowSeconds: 60 * 60 },
  search: { limit: 120, windowSeconds: 60 },
  orderLookup: { limit: 10, windowSeconds: 15 * 60 },
  upload: { limit: 60, windowSeconds: 10 * 60 },
  adminWrite: { limit: 300, windowSeconds: 60 },
} satisfies Record<string, RateLimitRule>;
